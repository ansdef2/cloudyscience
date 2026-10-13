import { Request, Response } from 'express';
import Equipment from '../models/Equipment';
import Institution from '../models/Institution';
import { Op } from 'sequelize';
import Booking from '../models/Booking';
import { sendError } from '../utils/sendError';
import {
  addDays,
  BOOKING_HORIZON_DAYS,
  dayRange,
  fromMinutes,
  isIsoDate,
  parseWorkingHours,
  siteNow,
  slotsFor,
  toMinutes,
} from '../utils/schedule';

export const getAllEquipment = async (req: Request, res: Response) => {
  try {
    const { search, institutionId, type, status } = req.query;

    const whereClause: any = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { type: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (institutionId) {
      whereClause.institutionId = institutionId;
    }
    if (type) {
      whereClause.type = { [Op.iLike]: String(type) };
    }
    if (status === 'open' || status === 'closed') {
      whereClause.isOpen = status === 'open';
    }

    const equipment = await Equipment.findAll({
      where: whereClause,
      include: [Institution],
      order: [['name', 'ASC']],
    });

    res.json(equipment);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const getEquipmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const equipment = await Equipment.findByPk(id, {
      include: [Institution],
    });

    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json(equipment);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const createEquipment = async (req: Request, res: Response) => {
  try {
    const equipment = await Equipment.create(req.body);
    const equipmentWithInstitution = await Equipment.findByPk(equipment.id, {
      include: [Institution],
    });
    res.status(201).json(equipmentWithInstitution);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const updateEquipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    await equipment.update(req.body);
    const updatedEquipment = await Equipment.findByPk(id, {
      include: [Institution],
    });
    res.json(updatedEquipment);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const deleteEquipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // С бронями оборудование не удаляем — пропала бы история; его можно закрыть
    const bookings = await Booking.count({ where: { equipmentId: id } });
    if (bookings) {
      return res.status(409).json({
        error: `У оборудования есть брони (${bookings}) — удалить нельзя. Снимите галочку «Работает», и бронировать его перестанут`,
      });
    }

    await equipment.destroy();
    res.json({ message: 'Equipment deleted successfully' });
  } catch (error: any) {
    sendError(res, error);
  }
};

/**
 * Свободные слоты на день: часы работы оборудования минус уже занятые
 * брони и прошедшее время. Кто занял слот, не раскрывается.
 */
export const getAvailability = async (req: Request, res: Response) => {
  try {
    const equipment = await Equipment.findByPk(req.params.id, { attributes: ['id', 'workingHours', 'isOpen'] });
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' });

    const now = siteNow();
    const date = isIsoDate(req.query.date) ? req.query.date : now.date;
    const lastDate = addDays(now.date, BOOKING_HORIZON_DAYS);
    const hours = parseWorkingHours(equipment.workingHours);

    const { start, end } = dayRange(date);
    const taken = new Set(
      (
        await Booking.findAll({
          where: {
            equipmentId: equipment.id,
            date: { [Op.gte]: start, [Op.lt]: end },
            status: { [Op.ne]: 'cancelled' },
          },
          attributes: ['time'],
        })
      ).map((booking) => booking.time)
    );

    const bookableDay = equipment.isOpen && date >= now.date && date <= lastDate;
    const slots = slotsFor(equipment.workingHours).map((time) => {
      const past = date < now.date || (date === now.date && toMinutes(time)! <= now.minutes);
      const status = taken.has(time) ? 'taken' : past || !bookableDay ? 'past' : 'free';
      return { time, status, available: status === 'free' };
    });

    res.json({
      date,
      today: now.date,
      // Закрытое оборудование не бронируется: все слоты недоступны
      closed: !equipment.isOpen,
      lastDate,
      workingHours: { start: fromMinutes(hours.start), end: fromMinutes(hours.end) },
      slots,
    });
  } catch (error: any) {
    sendError(res, error);
  }
};
