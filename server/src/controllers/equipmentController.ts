import { Request, Response } from 'express';
import Equipment from '../models/Equipment';
import Institution from '../models/Institution';
import { Op } from 'sequelize';
import { sendError } from '../utils/sendError';

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

    await equipment.destroy();
    res.json({ message: 'Equipment deleted successfully' });
  } catch (error: any) {
    sendError(res, error);
  }
};
