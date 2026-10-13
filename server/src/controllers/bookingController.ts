import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import Booking from '../models/Booking';
import Course from '../models/Course';
import Equipment from '../models/Equipment';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';
import User from '../models/User';
import { sendError } from '../utils/sendError';

const STATUSES = ['pending', 'confirmed', 'active', 'completed', 'cancelled'] as const;

/** Кто забронировал: администратору — с почтой, участникам команды — только имя */
const details = (isAdmin: boolean) => [
  { model: Course },
  { model: Equipment },
  { model: Team, attributes: ['id', 'name'] },
  { model: User, attributes: isAdmin ? ['id', 'name', 'email'] : ['id', 'name'] },
];

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
    const { courseId, equipmentId, teamId, date, time, endTime, rentalType, files, location, notes } =
      req.body;

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

    // Бронировать на команду может только её участник
    if (teamId) {
      const membership = await TeamMember.findOne({ where: { teamId, userId } });
      if (!membership) {
        return res.status(403).json({ error: 'Бронировать на команду могут только её участники' });
      }
    }

    const booking = await Booking.create({
      userId,
      equipmentId,
      teamId: teamId || null,
      date,
      time,
      endTime,
      rentalType: rentalType || 'remote',
      files: files || [],
      location,
      notes,
      status: 'pending',
    });

    res.status(201).json(await Booking.findByPk(booking.id, { include: details(false) }));
  } catch (error: any) {
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
      const { userId: _userId, ...rest } = body;
      changes = rest;
    } else {
      if (body.status !== undefined && body.status !== 'cancelled') {
        return res.status(403).json({ error: 'Статус брони меняет администратор; вы можете её отменить' });
      }
      changes = {};
      if (body.notes !== undefined) changes.notes = body.notes;
      if (body.status === 'cancelled') changes.status = 'cancelled';
    }

    await booking.update(changes);
    res.json(await Booking.findByPk(booking.id, { include: details(isAdmin) }));
  } catch (error: any) {
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
