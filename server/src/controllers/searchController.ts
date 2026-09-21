import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import Institution from '../models/Institution';
import Equipment from '../models/Equipment';
import Course from '../models/Course';
import Booking from '../models/Booking';
import Specialist from '../models/Specialist';
import { sendError } from '../utils/sendError';

type SearchResult = {
  id: string;
  type: 'equipment' | 'institution' | 'course' | 'specialist';
  name: string;
  address?: string;
  hours?: string;
  status?: 'open' | 'closed';
  distance?: string;
  avatar?: string;
};

// Вкладки поиска на фронте («по адресу» / «по услугам» / «по специалистам»)
// отображаются на сущности бэкенда
const TYPE_TO_ENTITIES: Record<
  string,
  Array<'institution' | 'equipment' | 'course' | 'specialist'>
> = {
  address: ['institution'],
  services: ['course'],
  equipment: ['equipment'],
  specialists: ['specialist'],
  all: ['institution', 'equipment', 'course', 'specialist'],
};

export const search = async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    const type = String(req.query.type || 'all');
    const statusFilter = (req.query['filter[status]'] as string) || undefined;

    if (!query) {
      return res.json([]);
    }

    const entities = TYPE_TO_ENTITIES[type] ?? TYPE_TO_ENTITIES.all;
    const like = { [Op.iLike]: `%${query}%` };
    const results: SearchResult[] = [];

    if (entities.includes('institution')) {
      const institutions = await Institution.findAll({
        where: { [Op.or]: [{ name: like }, { address: like }] },
        order: [['name', 'ASC']],
      });
      results.push(
        ...institutions
          .filter((i) => !statusFilter || i.isOpen === (statusFilter === 'open'))
          .map((i) => ({
            id: i.id,
            type: 'institution' as const,
            name: i.name,
            address: i.address,
            hours: i.workingHours,
            status: (i.isOpen ? 'open' : 'closed') as 'open' | 'closed',
          }))
      );
    }

    if (entities.includes('equipment')) {
      const where: any = { [Op.or]: [{ name: like }, { description: like }, { type: like }] };
      if (statusFilter === 'open' || statusFilter === 'closed') {
        where.isOpen = statusFilter === 'open';
      }
      const equipment = await Equipment.findAll({
        where,
        include: [Institution],
        order: [['name', 'ASC']],
      });
      results.push(
        ...equipment.map((e) => ({
          id: e.id,
          type: 'equipment' as const,
          name: e.name,
          address: (e as any).Institution?.address,
          hours: e.workingHours,
          status: (e.isOpen ? 'open' : 'closed') as 'open' | 'closed',
          distance: e.distance,
        }))
      );
    }

    if (entities.includes('course')) {
      const courses = await Course.findAll({
        where: { [Op.or]: [{ title: like }, { direction: like }] },
        include: [Institution],
        order: [['createdAt', 'DESC']],
      });
      results.push(
        ...courses.map((c) => ({
          id: c.id,
          type: 'course' as const,
          name: c.title,
          address: (c as any).Institution?.address,
          hours: (c as any).Institution?.workingHours,
        }))
      );
    }

    if (entities.includes('specialist')) {
      const specialists = await Specialist.findAll({
        where: { [Op.or]: [{ name: like }, { position: like }] },
        include: [Institution],
        order: [['name', 'ASC']],
      });
      results.push(
        ...specialists.map((s) => ({
          id: s.id,
          type: 'specialist' as const,
          name: s.name,
          address: (s as any).Institution?.address,
          avatar: s.avatar,
        }))
      );
    }

    res.json(results);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const getPopularSearches = async (_req: Request, res: Response) => {
  try {
    // Популярное = чаще всего бронируемое оборудование
    const topBooked = (await Booking.findAll({
      attributes: ['equipmentId', [fn('COUNT', col('equipmentId')), 'bookingCount']],
      where: { equipmentId: { [Op.ne]: null } },
      group: ['equipmentId', 'Equipment.id'],
      include: [{ model: Equipment, attributes: ['name'] }],
      order: [[literal('"bookingCount"'), 'DESC']],
      limit: 5,
    })) as any[];

    const names = topBooked
      .map((b) => b.Equipment?.name)
      .filter((name: string | undefined): name is string => Boolean(name));

    if (names.length > 0) {
      return res.json(names);
    }

    // Пока бронирований нет — отдаём названия доступного оборудования
    const equipment = await Equipment.findAll({
      attributes: ['name'],
      order: [['name', 'ASC']],
      limit: 5,
    });
    res.json(equipment.map((e) => e.name));
  } catch (error: any) {
    sendError(res, error);
  }
};
