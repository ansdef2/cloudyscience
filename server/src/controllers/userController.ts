import { Request, Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { hashPassword } from '../utils/hashPassword';

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
    res.status(500).json({ error: error.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
};
