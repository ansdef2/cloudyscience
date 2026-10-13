import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { sendError } from '../utils/sendError';
import { siteUrl } from '../utils/mailer';
import { issueToken } from '../utils/userTokens';
import { adminView } from '../utils/userView';
import { sendParentConsentLetter } from './authController';
import { disconnectUser } from '../realtime/hub';

/** Пользователи для админки: поиск по имени и почте, фильтр по статусу */
export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const filter = req.query.filter;

    const where: any = {};
    if (search) where[Op.or] = [{ name: { [Op.iLike]: `%${search}%` } }, { email: { [Op.iLike]: `%${search}%` } }];
    if (filter === 'blocked') where.isBlocked = true;
    if (filter === 'consent') where.parentConsentStatus = 'pending';
    if (filter === 'admins') where.role = 'admin';

    const users = await User.findAll({ where, order: [['createdAt', 'DESC']], limit: 300 });
    res.json(users.map(adminView));
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * Роль, блокировка, подтверждение согласия родителя вручную
 * (например, родитель принёс бумажное согласие).
 */
export const updateUserByAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const { role, isBlocked, blockedReason, parentConsentStatus } = req.body ?? {};
    const isSelf = user.id === req.user.id;
    const changes: Record<string, unknown> = {};

    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'role: user или admin' });
      if (isSelf && role !== 'admin') return res.status(400).json({ error: 'Нельзя снять права с себя' });
      changes.role = role;
    }

    if (isBlocked !== undefined) {
      if (isSelf) return res.status(400).json({ error: 'Нельзя заблокировать себя' });
      changes.isBlocked = !!isBlocked;
      changes.blockedReason = isBlocked && typeof blockedReason === 'string' ? blockedReason.trim().slice(0, 500) || null : null;
      // Блокировка выкидывает со всех устройств
      if (isBlocked && !user.isBlocked) changes.tokenVersion = user.tokenVersion + 1;
    }

    if (parentConsentStatus !== undefined) {
      if (!['pending', 'confirmed'].includes(parentConsentStatus) || user.parentConsentStatus === 'not_required') {
        return res.status(400).json({ error: 'Согласие родителя этому пользователю не требуется' });
      }
      changes.parentConsentStatus = parentConsentStatus;
      changes.parentConsentAt = parentConsentStatus === 'confirmed' ? new Date() : null;
    }

    await user.update(changes);
    if (changes.isBlocked) disconnectUser(user.id);
    res.json(adminView(user));
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * Ссылка для сброса пароля — когда почта на сервере не настроена
 * или письмо не дошло. Администратор передаёт её человеку сам.
 */
export const createResetLink = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const token = await issueToken(user.id, 'password_reset');
    res.json({ url: `${siteUrl()}/reset?token=${token}`, expiresInMinutes: 60 });
  } catch (error) {
    sendError(res, error);
  }
};

/** Повторить письмо родителю или получить ссылку согласия, чтобы передать её самому */
export const createParentConsentLink = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.parentConsentStatus !== 'pending') {
      return res.status(400).json({ error: 'Согласие родителя не ожидается' });
    }
    const result = await sendParentConsentLetter(user);
    const token = result ? result.token : await issueToken(user.id, 'parent_consent');
    res.json({ url: `${siteUrl()}/consent?token=${token}`, sent: !!result && result.sent });
  } catch (error) {
    sendError(res, error);
  }
};
