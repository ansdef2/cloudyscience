import { Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { AuthRequest } from '../middleware/auth';
import Booking from '../models/Booking';
import FileUpload from '../models/FileUpload';
import Course from '../models/Course';
import Equipment from '../models/Equipment';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';
import User from '../models/User';
import { sendError } from '../utils/sendError';
import { attachFilesToBooking } from './uploadController';
import { BOOKING_FILES_MAX } from '../config/uploads';
import { dayRange, normalizeTime, storedDate, validateSlot } from '../utils/schedule';
import { notify, notifyAdmins } from '../utils/notify';

const STATUS_LABEL: Record<string, string> = {
  pending: 'ожидает подтверждения',
  confirmed: 'подтверждена',
  active: 'идёт',
  completed: 'завершена',
  cancelled: 'отменена',
};

const humanDate = (date: string | Date) =>
  new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });

const STATUSES = ['pending', 'confirmed', 'active', 'completed', 'cancelled'] as const;

/** Кто забронировал: администратору — с почтой, участникам команды — только имя */
const details = (isAdmin: boolean) => [
  { model: Course },
  { model: Equipment },
  { model: Team, attributes: ['id', 'name'] },
  { model: User, attributes: isAdmin ? ['id', 'name', 'email'] : ['id', 'name'] },
  { model: FileUpload, as: 'uploads', attributes: ['id', 'originalName', 'size', 'createdAt'] },
];

/** Бронь, которая занимает слот: всё, кроме отменённых */
const ACTIVE_STATUSES = ['pending', 'confirmed', 'active', 'completed'];

class SlotTaken extends Error {}

/**
 * Занят ли слот. Вызывать внутри транзакции после блокировки строки
 * оборудования — тогда две одновременные брони одного слота не пройдут обе.
 */
const ensureSlotFree = async (
  equipmentId: string,
  date: string,
  time: string,
  transaction: import('sequelize').Transaction,
  exceptBookingId?: string
) => {
  const { start, end } = dayRange(date);
  const clash = await Booking.findOne({
    where: {
      equipmentId,
      time,
      date: { [Op.gte]: start, [Op.lt]: end },
      status: { [Op.in]: ACTIVE_STATUSES },
      ...(exceptBookingId ? { id: { [Op.ne]: exceptBookingId } } : {}),
    },
    transaction,
  });
  if (clash) throw new SlotTaken();
};

const slotTakenResponse = (res: Response) =>
  res.status(409).json({ error: 'Это время уже заняли — выберите другое', code: 'SLOT_TAKEN' });

const myTeamIds = async (userId: string) =>
  (await TeamMember.findAll({ where: { userId }, attributes: ['teamId'] })).map((row) => row.teamId);

/**
 * Видеть бронь могут её автор, участники команды, на которую она оформлена,
 * и администратор. Менять и удалять — автор и администратор.
 */
const access = async (booking: Booking, req: AuthRequest) => {
  const isAdmin = req.user.role === 'admin';
  const isOwner = booking.userId === req.user.id;
  const isTeammate =
    !!booking.teamId && !!(await TeamMember.findOne({ where: { teamId: booking.teamId, userId: req.user.id } }));
  return { isAdmin, isOwner, canView: isAdmin || isOwner || isTeammate, canEdit: isAdmin || isOwner };
};

/** Свои брони и брони своих команд; администратору — все */
export const getAllBookings = async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user.role === 'admin';

    // Видимость ограничивается условием в запросе, а не фильтрацией ответа
    const where = isAdmin
      ? {}
      : { [Op.or]: [{ userId: req.user.id }, { teamId: { [Op.in]: await myTeamIds(req.user.id) } }] };

    const bookings = await Booking.findAll({
      where,
      include: details(isAdmin),
      order: [['date', 'DESC']],
    });

    res.json(bookings);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const getBookingById = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const { canView, isAdmin } = await access(booking, req);
    // Чужая бронь неотличима от несуществующей
    if (!canView) return res.status(404).json({ error: 'Booking not found' });

    res.json(await Booking.findByPk(booking.id, { include: details(isAdmin) }));
  } catch (error: any) {
    sendError(res, error);
  }
};

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { courseId, equipmentId, teamId, date, time, rentalType, fileIds, location, notes } = req.body ?? {};

    // Запись на курс живёт в course_enrollments: там одна запись на человека
    // и счёт мест. Через брони её больше не создать — иначе оба ограничения обходятся.
    if (courseId) {
      return res.status(400).json({
        error: 'Запись на курс оформляется через POST /api/courses/:id/enroll',
      });
    }

    if (!equipmentId) {
      return res.status(400).json({ error: 'Equipment must be specified' });
    }

    if (Array.isArray(fileIds) && fileIds.length > BOOKING_FILES_MAX) {
      return res.status(400).json({ error: `Не больше ${BOOKING_FILES_MAX} файлов к одной брони` });
    }

    // Бронировать на команду может только её участник
    if (teamId) {
      const membership = await TeamMember.findOne({ where: { teamId, userId } });
      if (!membership) {
        return res.status(403).json({ error: 'Бронировать на команду могут только её участники' });
      }
    }

    const created = await sequelize.transaction(async (transaction) => {
      // Блокировка строки оборудования выстраивает брони одного станка в очередь
      const equipment = await Equipment.findByPk(equipmentId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!equipment) throw Object.assign(new Error('Оборудование не найдено'), { status: 404 });
      if (!equipment.isOpen) {
        throw Object.assign(new Error('Оборудование сейчас не принимает брони'), { status: 409 });
      }

      const problem = validateSlot(date, time, equipment.workingHours);
      if (problem) throw Object.assign(new Error(problem), { status: 400 });

      const slotTime = normalizeTime(time);
      await ensureSlotFree(equipment.id, date, slotTime, transaction);

      const booking = await Booking.create(
        {
          userId,
          equipmentId: equipment.id,
          teamId: teamId || null,
          date: storedDate(date),
          time: slotTime,
          rentalType: rentalType === 'in-person' ? 'in-person' : 'remote',
          location,
          notes,
          status: 'pending',
        },
        { transaction }
      );

      const files = await attachFilesToBooking(fileIds, userId, booking.id, transaction);
      if (files.length) {
        await booking.update({ files: files.map((file) => file.originalName) }, { transaction });
      }
      return { id: booking.id, equipmentName: equipment.name, time: slotTime };
    });

    await notifyAdmins(
      {
        type: 'booking_new',
        title: 'Новая бронь',
        body: `${req.user.name}: ${created.equipmentName}, ${humanDate(storedDate(date))} в ${created.time}`,
        link: '/admin?tab=bookings',
      },
      { email: true }
    );

    res.status(201).json(await Booking.findByPk(created.id, { include: details(false) }));
  } catch (error: any) {
    if (error instanceof SlotTaken) return slotTakenResponse(res);
    if (error?.status) return res.status(error.status).json({ error: error.message });
    sendError(res, error);
  }
};

/**
 * Администратор меняет что угодно, в том числе статус. Автор — только
 * заметку и отмену: подтверждать собственную бронь ему незачем.
 */
export const updateBooking = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const { canView, canEdit, isAdmin } = await access(booking, req);
    if (!canView) return res.status(404).json({ error: 'Booking not found' });
    if (!canEdit) return res.status(403).json({ error: 'Менять бронь может её автор' });

    const body = req.body ?? {};
    if (body.status !== undefined && !STATUSES.includes(body.status)) {
      return res.status(400).json({ error: `status: одно из ${STATUSES.join(', ')}` });
    }

    let changes: Record<string, unknown>;
    if (isAdmin) {
      // Администратор правит статус, заметку и доступ к оборудованию.
      // Перенос на другое время — новой бронью, чтобы не обойти проверку слота.
      changes = {};
      for (const key of ['status', 'notes', 'accessInfo', 'location'] as const) {
        if (body[key] !== undefined) changes[key] = body[key];
      }
    } else {
      if (body.status !== undefined && body.status !== 'cancelled') {
        return res.status(403).json({ error: 'Статус брони меняет администратор; вы можете её отменить' });
      }
      changes = {};
      if (body.notes !== undefined) changes.notes = body.notes;
      if (body.status === 'cancelled') changes.status = 'cancelled';
    }

    const previousStatus = booking.status;
    const previousAccess = booking.accessInfo ?? null;

    // Вернуть отменённую бронь можно, только если её слот никто не занял
    const reviving =
      booking.status === 'cancelled' && changes.status !== undefined && changes.status !== 'cancelled';

    await sequelize.transaction(async (transaction) => {
      if (reviving && booking.equipmentId) {
        await Equipment.findByPk(booking.equipmentId, { transaction, lock: transaction.LOCK.UPDATE });
        const date = new Date(booking.date).toISOString().slice(0, 10);
        await ensureSlotFree(booking.equipmentId, date, booking.time, transaction, booking.id);
      }
      await booking.update(changes, { transaction });
    });

    const updated = await Booking.findByPk(booking.id, { include: details(isAdmin) });
    const equipmentName = (updated as any)?.Equipment?.name ?? 'оборудование';
    const when = `${humanDate(booking.date)} в ${booking.time}`;

    if (isAdmin && booking.userId !== req.user.id) {
      // Автору брони — о решении администратора; письмом, это важно не пропустить
      if (changes.status !== undefined && previousStatus !== changes.status) {
        await notify(
          booking.userId,
          {
            type: 'booking_status',
            title: `Бронь ${STATUS_LABEL[String(changes.status)] ?? changes.status}`,
            body: `${equipmentName}, ${when}`,
            link: '/profile',
          },
          { email: true }
        );
      }
      if (changes.accessInfo && changes.accessInfo !== previousAccess) {
        await notify(
          booking.userId,
          {
            type: 'booking_access',
            title: 'Данные для подключения к оборудованию',
            body: `${equipmentName}, ${when}. Откройте бронь в профиле.`,
            link: '/profile',
          },
          { email: true }
        );
      }
    } else if (changes.status === 'cancelled' && previousStatus !== 'cancelled') {
      await notifyAdmins({
        type: 'booking_cancelled',
        title: 'Бронь отменена',
        body: `${req.user.name}: ${equipmentName}, ${when}`,
        link: '/admin?tab=bookings',
      });
    }

    res.json(updated);
  } catch (error: any) {
    if (error instanceof SlotTaken) return slotTakenResponse(res);
    sendError(res, error);
  }
};

export const deleteBooking = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const { canView, canEdit } = await access(booking, req);
    if (!canView) return res.status(404).json({ error: 'Booking not found' });
    if (!canEdit) return res.status(403).json({ error: 'Удалить бронь может её автор' });

    await booking.destroy();
    res.json({ message: 'Booking deleted successfully' });
  } catch (error: any) {
    sendError(res, error);
  }
};
