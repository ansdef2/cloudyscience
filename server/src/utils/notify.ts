import Notification from '../models/Notification';
import User from '../models/User';
import { pushTo } from '../realtime/hub';
import { sendMail, siteUrl } from './mailer';

interface NotificationInput {
  type: string;
  title: string;
  body?: string;
  link?: string;
}

const letter = (to: string, input: NotificationInput) =>
  sendMail({
    to,
    subject: input.title,
    paragraphs: [input.title, ...(input.body ? [input.body] : [])],
    action: input.link ? { label: 'Открыть на сайте', url: `${siteUrl()}${input.link}` } : undefined,
  });

/**
 * Уведомление человеку: в колокольчик, сразу по сокету и, если просили,
 * письмом. Ошибка уведомления не должна ломать основное действие —
 * поэтому всё, что не запись в базу, идёт без ожидания.
 */
export const notify = async (userId: string, input: NotificationInput, options: { email?: boolean } = {}) => {
  try {
    const notification = await Notification.create({ userId, ...input });
    pushTo([userId], { type: 'notification', notification: notification.toJSON() });

    if (options.email) {
      const user = await User.findByPk(userId, { attributes: ['email', 'isBlocked'] });
      if (user && !user.isBlocked) void letter(user.email, input);
    }
  } catch (error) {
    console.error('Уведомление не создано:', error instanceof Error ? error.message : error);
  }
};

/** Всем администраторам; письмо — на ADMIN_NOTIFY_EMAIL, если задан */
export const notifyAdmins = async (input: NotificationInput, options: { email?: boolean } = {}) => {
  try {
    const admins = await User.findAll({ where: { role: 'admin', isBlocked: false }, attributes: ['id'] });
    const created = await Notification.bulkCreate(admins.map((admin) => ({ userId: admin.id, ...input })));
    for (const notification of created) {
      pushTo([notification.userId], { type: 'notification', notification: notification.toJSON() });
    }
    if (options.email && process.env.ADMIN_NOTIFY_EMAIL) void letter(process.env.ADMIN_NOTIFY_EMAIL, input);
  } catch (error) {
    console.error('Уведомление администраторам не создано:', error instanceof Error ? error.message : error);
  }
};
