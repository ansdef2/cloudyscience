import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Promocode from '../models/Promocode';
import Equipment from '../models/Equipment';

/** Промокод считается доступным, пока активен и не истёк */
const availableWhere = () => ({
  isActive: true,
  [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
});

export const getAllPromocodes = async (req: Request, res: Response) => {
  try {
    const { equipmentId } = req.query;

    const whereClause: any = availableWhere();
    if (equipmentId) {
      whereClause.equipmentId = equipmentId;
    }

    const promocodes = await Promocode.findAll({
      where: whereClause,
      include: [Equipment],
      order: [['createdAt', 'DESC']],
    });

    res.json(promocodes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPromocodeById = async (req: Request, res: Response) => {
  try {
    const promocode = await Promocode.findByPk(req.params.id, { include: [Equipment] });

    if (!promocode) {
      return res.status(404).json({ error: 'Promocode not found' });
    }

    res.json(promocode);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * «Забрать промокод» на карточке оборудования: отдаёт первый доступный
 * промокод для этого оборудования.
 */
export const claimPromocode = async (req: Request, res: Response) => {
  try {
    const { equipmentId } = req.body;

    if (!equipmentId) {
      return res.status(400).json({ error: 'Equipment must be specified' });
    }

    const promocode = await Promocode.findOne({
      where: { ...availableWhere(), equipmentId },
      order: [['createdAt', 'ASC']],
    });

    if (!promocode) {
      return res.status(404).json({ error: 'No available promocode for this equipment' });
    }

    res.json({
      id: promocode.id,
      code: promocode.code,
      title: promocode.title,
      description: promocode.description,
      discount: promocode.discount,
      expiresAt: promocode.expiresAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createPromocode = async (req: Request, res: Response) => {
  try {
    const promocode = await Promocode.create(req.body);
    res.status(201).json(promocode);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deletePromocode = async (req: Request, res: Response) => {
  try {
    const promocode = await Promocode.findByPk(req.params.id);

    if (!promocode) {
      return res.status(404).json({ error: 'Promocode not found' });
    }

    await promocode.destroy();
    res.json({ message: 'Promocode deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
