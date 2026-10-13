import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';
import { sendError } from '../utils/sendError';

/** Последние уведомления и число непрочитанных */
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const [items, unread] = await Promise.all([
      Notification.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']], limit: 50 }),
      Notification.count({ where: { userId: req.user.id, readAt: null } }),
    ]);
    res.json({ items, unread });
  } catch (error) {
    sendError(res, error);
  }
};

export const markRead = async (req: AuthRequest, res: Response) => {
  try {
    await Notification.update(
      { readAt: new Date() },
      { where: { id: req.params.id, userId: req.user.id, readAt: null } }
    );
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
};

export const markAllRead = async (req: AuthRequest, res: Response) => {
  try {
    await Notification.update({ readAt: new Date() }, { where: { userId: req.user.id, readAt: null } });
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
};

/** Старые прочитанные уведомления не нужны — чистим раз в сутки */
export const startNotificationCleanup = () => {
  const run = () =>
    Notification.destroy({
      where: { readAt: { [Op.ne]: null }, createdAt: { [Op.lt]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
    }).catch(() => undefined);
  setInterval(run, 24 * 60 * 60 * 1000).unref();
};
