import { Request, Response } from 'express';
import Institution from '../models/Institution';
import Course from '../models/Course';
import { Op } from 'sequelize';
import Equipment from '../models/Equipment';
import Specialist from '../models/Specialist';
import { sendError } from '../utils/sendError';

export const getAllInstitutions = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    
    let whereClause: any = {};
    if (search) {
      whereClause = {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { address: { [Op.iLike]: `%${search}%` } },
        ],
      };
    }

    const institutions = await Institution.findAll({
      where: whereClause,
      order: [['name', 'ASC']],
    });

    res.json(institutions);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const getInstitutionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const institution = await Institution.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'courses',
        },
      ],
    });

    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    res.json(institution);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const getInstitutionCourses = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const institution = await Institution.findByPk(id);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    const courses = await Course.findAll({
      where: { institutionId: id },
      order: [['createdAt', 'DESC']],
    });

    res.json(courses);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const createInstitution = async (req: Request, res: Response) => {
  try {
    const institution = await Institution.create(req.body);
    res.status(201).json(institution);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const updateInstitution = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const institution = await Institution.findByPk(id);

    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    await institution.update(req.body);
    res.json(institution);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const deleteInstitution = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const institution = await Institution.findByPk(id);

    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    // Учреждение с оборудованием, курсами или экспертами удалить нельзя —
    // иначе пропадут брони и записи. Сначала удаляются или переносятся они
    const [equipment, courses, specialists] = await Promise.all([
      Equipment.count({ where: { institutionId: id } }),
      Course.count({ where: { institutionId: id } }),
      Specialist.count({ where: { institutionId: id } }),
    ]);
    if (equipment || courses || specialists) {
      return res.status(409).json({
        error: `Сначала удалите или перенесите: оборудования ${equipment}, курсов ${courses}, экспертов ${specialists}`,
      });
    }

    await institution.destroy();
    res.json({ message: 'Institution deleted successfully' });
  } catch (error: any) {
    sendError(res, error);
  }
};
