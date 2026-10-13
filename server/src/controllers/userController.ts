import { Request, Response } from 'express';
import { Op } from 'sequelize';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { hashPassword } from '../utils/hashPassword';
import { sendError } from '../utils/sendError';

/** Свой профиль правит владелец, чужой — только администратор. */
const canManage = (req: AuthRequest, id: string) =>
  req.user?.role === 'admin' || req.user?.id === id;

export const getAllUsers = async (req: any, res: Response) => {
  try {
    // Only admins can see all users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    res.json(users);
  } catch (error: any) {
    sendError(res, error);
  }
};

/**
 * Обучающиеся для поиска — чтобы написать человеку и позвать в команду.
 * Только имя и аватар: почту не отдаём, для связи есть чаты.
 */
export const getDirectory = async (req: AuthRequest, res: Response) => {
  try {
    const where: any = { role: 'user', id: { [Op.ne]: req.user.id } };
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search) where.name = { [Op.iLike]: `%${search}%` };

    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'avatar'],
      order: [['name', 'ASC']],
      limit: 100,
    });

    res.json(users);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Чужой профиль — только публичные поля: почту видят владелец и админ
    const user = await User.findByPk(id, {
      attributes: canManage(req, id) ? { exclude: ['password'] } : ['id', 'name', 'avatar'],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!canManage(req, id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Белый список полей: update(req.body) позволял любому пользователю
    // выдать себе role: 'admin' и сохранить пароль в открытом виде.
    const { name, avatar, email, password, role } = req.body;
    const changes: Record<string, unknown> = {};

    if (name !== undefined) changes.name = name;
    if (avatar !== undefined) changes.avatar = avatar;
    if (email !== undefined) changes.email = email;
    if (password !== undefined) changes.password = await hashPassword(password);
    if (role !== undefined && req.user?.role === 'admin') changes.role = role;

    await user.update(changes);
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });
    res.json(updatedUser);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!canManage(req, id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    sendError(res, error);
  }
};
