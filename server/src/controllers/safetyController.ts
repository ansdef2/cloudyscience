import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import Message from '../models/Message';
import Report, { REPORT_REASONS } from '../models/Report';
import TeamMember from '../models/TeamMember';
import User from '../models/User';
import UserBlock from '../models/UserBlock';
import { notify, notifyAdmins } from '../utils/notify';
import { sendError } from '../utils/sendError';

const REASON_LABEL: Record<string, string> = {
  spam: 'спам или реклама',
  insult: 'оскорбления, травля',
  adult: 'неприемлемый контент',
  danger: 'угрозы или опасность для ребёнка',
  fraud: 'мошенничество',
  other: 'другое',
};

/** Есть ли блокировка между двумя людьми в любую сторону */
export const isBlockedBetween = async (a: string, b: string) =>
  !!(await UserBlock.findOne({
    where: {
      [Op.or]: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  }));

/** Кого человек заблокировал и кто заблокировал его — чтобы скрыть их в поиске */
export const blockedPeerIds = async (userId: string) => {
  const rows = await UserBlock.findAll({
    where: { [Op.or]: [{ blockerId: userId }, { blockedId: userId }] },
  });
  return rows.map((row) => (row.blockerId === userId ? row.blockedId : row.blockerId));
};

export const getMyBlocks = async (req: AuthRequest, res: Response) => {
  try {
    const rows = await UserBlock.findAll({ where: { blockerId: req.user.id } });
    const users = await User.findAll({
      where: { id: { [Op.in]: rows.map((row) => row.blockedId) } },
      attributes: ['id', 'name', 'avatar'],
    });
    res.json(users);
  } catch (error) {
    sendError(res, error);
  }
};

export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Нельзя заблокировать себя' });
    const target = await User.findByPk(req.params.id, { attributes: ['id'] });
    if (!target) return res.status(404).json({ error: 'Пользователь не найден' });

    await UserBlock.findOrCreate({
      where: { blockerId: req.user.id, blockedId: target.id },
      defaults: { blockerId: req.user.id, blockedId: target.id },
    });
    res.json({ blocked: true });
  } catch (error) {
    sendError(res, error);
  }
};

export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    await UserBlock.destroy({ where: { blockerId: req.user.id, blockedId: req.params.id } });
    res.json({ blocked: false });
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * Жалоба на человека или на конкретное сообщение. Пожаловаться на
 * сообщение можно, только если оно было вам видно: личное — вам,
 * командное — в вашей команде.
 */
export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, messageId, reason, comment } = req.body ?? {};
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: `reason: одно из ${REPORT_REASONS.join(', ')}` });
    }

    let targetUserId: string | undefined = userId;
    let messageText: string | null = null;
    if (messageId) {
      const message = await Message.findByPk(messageId);
      const visible =
        message &&
        (message.teamId
          ? !!(await TeamMember.findOne({ where: { teamId: message.teamId, userId: req.user.id } }))
          : message.recipientId === req.user.id || message.senderId === req.user.id);
      if (!message || !visible) return res.status(404).json({ error: 'Сообщение не найдено' });
      targetUserId = message.senderId;
      messageText = message.text;
    }

    if (!targetUserId || targetUserId === req.user.id) {
      return res.status(400).json({ error: 'Укажите, на кого жалоба' });
    }
    const target = await User.findByPk(targetUserId, { attributes: ['id', 'name'] });
    if (!target) return res.status(404).json({ error: 'Пользователь не найден' });

    const report = await Report.create({
      reporterId: req.user.id,
      targetUserId: target.id,
      messageId: messageId || null,
      messageText,
      reason,
      comment: typeof comment === 'string' ? comment.trim().slice(0, 2000) || null : null,
    });

    await notifyAdmins(
      {
        type: 'report_new',
        title: 'Новая жалоба',
        body: `${req.user.name} пожаловался(-лась) на ${target.name}: ${REASON_LABEL[reason]}`,
        link: '/admin?tab=reports',
      },
      { email: true }
    );

    res.status(201).json({ id: report.id, message: 'Жалоба отправлена — администратор её рассмотрит' });
  } catch (error) {
    sendError(res, error);
  }
};

export const listReports = async (req: AuthRequest, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'open';
    const reports = await Report.findAll({
      where: status === 'all' ? {} : { status },
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'target', attributes: ['id', 'name', 'email', 'isBlocked'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    res.json(reports);
  } catch (error) {
    sendError(res, error);
  }
};

/** Решение по жалобе; автору жалобы приходит уведомление */
export const resolveReport = async (req: AuthRequest, res: Response) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Жалоба не найдена' });

    const { status, resolution } = req.body ?? {};
    if (!['open', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'status: open, resolved или dismissed' });
    }

    await report.update({
      status,
      resolution: typeof resolution === 'string' ? resolution.trim().slice(0, 2000) || null : null,
      resolvedById: status === 'open' ? null : req.user.id,
    });

    if (status !== 'open') {
      await notify(report.reporterId, {
        type: 'report_resolved',
        title: status === 'resolved' ? 'Жалоба рассмотрена — приняты меры' : 'Жалоба рассмотрена',
        body:
          status === 'resolved'
            ? 'Спасибо, что сообщили. Администратор принял меры.'
            : 'Администратор не нашёл нарушения правил. Если ситуация повторится — пожалуйтесь снова.',
      });
    }

    res.json(report);
  } catch (error) {
    sendError(res, error);
  }
};
