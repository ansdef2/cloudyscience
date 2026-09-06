import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Specialist from '../models/Specialist';
import Institution from '../models/Institution';

export const getAllSpecialists = async (req: Request, res: Response) => {
  try {
    const { search, institutionId } = req.query;

    const whereClause: any = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { position: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (institutionId) {
      whereClause.institutionId = institutionId;
    }

    const specialists = await Specialist.findAll({
      where: whereClause,
      include: [Institution],
      order: [['name', 'ASC']],
    });

    res.json(specialists);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSpecialistById = async (req: Request, res: Response) => {
  try {
    const specialist = await Specialist.findByPk(req.params.id, {
      include: [Institution],
    });

    if (!specialist) {
      return res.status(404).json({ error: 'Specialist not found' });
    }

    res.json(specialist);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createSpecialist = async (req: Request, res: Response) => {
  try {
    const specialist = await Specialist.create(req.body);
    res.status(201).json(await Specialist.findByPk(specialist.id, { include: [Institution] }));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSpecialist = async (req: Request, res: Response) => {
  try {
    const specialist = await Specialist.findByPk(req.params.id);

    if (!specialist) {
      return res.status(404).json({ error: 'Specialist not found' });
    }

    await specialist.update(req.body);
    res.json(await Specialist.findByPk(specialist.id, { include: [Institution] }));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteSpecialist = async (req: Request, res: Response) => {
  try {
    const specialist = await Specialist.findByPk(req.params.id);

    if (!specialist) {
      return res.status(404).json({ error: 'Specialist not found' });
    }

    await specialist.destroy();
    res.json({ message: 'Specialist deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
