import { Request, Response } from 'express';
import { Op } from 'sequelize';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { sendError } from '../utils/sendError';
import { comparePassword } from '../utils/hashPassword';
import { deleteAccount } from '../utils/deleteAccount';
import { blockedPeerIds } from './safetyController';
import { selfView } from '../utils/userView';
import { removeStoredFile, PUBLIC_DIR } from '../config/uploads';
import { storeImage } from './uploadController';
import FileUpload from '../models/FileUpload';

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
    // Заблокированных, детей без согласия родителя и тех, с кем есть
    // личная блокировка, в поиске нет: им всё равно нельзя написать
    const hidden = [req.user.id, ...(await blockedPeerIds(req.user.id))];
    const where: any = {
      role: 'user',
      id: { [Op.notIn]: hidden },
      isBlocked: false,
      parentConsentStatus: { [Op.ne]: 'pending' },
    };
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

/**
 * Правка чужого профиля — только администратор, и только имя.
 * Свой профиль — через /users/me, пароль — через /users/me/password
 * (с текущим паролем), роль и блокировка — через /admin/users.
 * Раньше любой мог прислать сюда role: 'admin' или сменить пароль без старого.
 */
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

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : undefined;
    if (name !== undefined && (name.length < 2 || name.length > 80)) {
      return res.status(400).json({ error: 'Имя — от 2 до 80 символов' });
    }
    if (name !== undefined) await user.update({ name });

    res.json(selfView(user));
  } catch (error: any) {
    sendError(res, error);
  }
};

/** Удалить старую картинку аватара с диска, если она наша */
const dropAvatarFile = async (avatar?: string | null) => {
  const match = avatar?.match(/^\/api\/files\/([\w.-]+)$/);
  if (!match) return;
  await FileUpload.destroy({ where: { storedName: match[1] } });
  await removeStoredFile(PUBLIC_DIR, match[1]);
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const file = await storeImage(req);
    const previous = req.user.avatar;
    await req.user.update({ avatar: `/api/files/${file.storedName}` });
    await dropAvatarFile(previous);
    res.json(selfView(req.user));
  } catch (error: any) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    sendError(res, error);
  }
};

export const removeAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const previous = req.user.avatar;
    await req.user.update({ avatar: null });
    await dropAvatarFile(previous);
    res.json(selfView(req.user));
  } catch (error: any) {
    sendError(res, error);
  }
};

/** Администратор удаляет чужой аккаунт — так же, обезличиванием */
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Свой аккаунт удаляется из настроек' });

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Сначала снимите права администратора' });

    await deleteAccount(user);
    res.json({ message: 'Аккаунт удалён' });
  } catch (error: any) {
    sendError(res, error);
  }
};

/** Удалить свой аккаунт — с паролем, чтобы украденный токен не стёр его */
export const deleteMe = async (req: AuthRequest, res: Response) => {
  try {
    if (typeof req.body?.password !== 'string' || !(await comparePassword(req.body.password, req.user.password))) {
      return res.status(400).json({ error: 'Пароль указан неверно' });
    }
    if (req.user.role === 'admin') {
      return res.status(400).json({ error: 'Администратор не может удалить себя — попросите другого администратора' });
    }

    await deleteAccount(req.user);
    res.json({ message: 'Аккаунт удалён' });
  } catch (error: any) {
    sendError(res, error);
  }
};
