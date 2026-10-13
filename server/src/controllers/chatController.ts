import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import Message from '../models/Message';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';
import User from '../models/User';
import { sendError } from '../utils/sendError';
import { PUBLIC_USER_ATTRIBUTES } from './teamController';

const between = (a: string, b: string) => ({
  teamId: null,
  [Op.or]: [
    { senderId: a, recipientId: b },
    { senderId: b, recipientId: a },
  ],
});

/**
 * Список чатов: личные переписки (последнее сообщение и число
 * непрочитанных) и командные чаты всех команд пользователя.
 */
export const getChats = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user.id as string;

    const direct = await Message.findAll({
      where: { teamId: null, [Op.or]: [{ senderId: me }, { recipientId: me }] },
      order: [['createdAt', 'DESC']],
      limit: 1000,
    });

    // Последнее сообщение и непрочитанные — по собеседнику
    const byPeer = new Map<string, { last: Message; unread: number }>();
    for (const message of direct) {
      const peerId = message.senderId === me ? message.recipientId! : message.senderId;
      const entry = byPeer.get(peerId) ?? { last: message, unread: 0 };
      if (message.recipientId === me && !message.readAt) entry.unread += 1;
      byPeer.set(peerId, entry);
    }

    const peers = await User.findAll({
      where: { id: { [Op.in]: Array.from(byPeer.keys()) } },
      attributes: PUBLIC_USER_ATTRIBUTES,
    });

    const memberships = await TeamMember.findAll({ where: { userId: me } });
    const teams = await Team.findAll({
      where: { id: { [Op.in]: memberships.map((membership) => membership.teamId) } },
    });
    const lastTeamMessages = await Promise.all(
      teams.map((team) =>
        Message.findOne({
          where: { teamId: team.id },
          include: [{ model: User, as: 'sender', attributes: PUBLIC_USER_ATTRIBUTES }],
          order: [['createdAt', 'DESC']],
        })
      )
    );

    const chats = [
      ...peers.map((peer) => {
        const entry = byPeer.get(peer.id)!;
        return {
          kind: 'user' as const,
          id: peer.id,
          title: peer.name,
          avatar: peer.avatar ?? null,
          lastMessage: entry.last.text,
          lastAt: entry.last.createdAt,
          unread: entry.unread,
        };
      }),
      ...teams.map((team, index) => ({
        kind: 'team' as const,
        id: team.id,
        title: team.name,
        avatar: null,
        lastMessage: lastTeamMessages[index]
          ? `${(lastTeamMessages[index] as any).sender?.name ?? ''}: ${lastTeamMessages[index]!.text}`
          : 'Сообщений пока нет',
        lastAt: lastTeamMessages[index]?.createdAt ?? team.createdAt,
        unread: 0,
      })),
    ].sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

    res.json(chats);
  } catch (error) {
    sendError(res, error);
  }
};

/** Переписка с человеком. Входящие помечаются прочитанными. ?after=ISO — только новые */
export const getDirectMessages = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user.id as string;
    const peer = await User.findByPk(req.params.userId, { attributes: PUBLIC_USER_ATTRIBUTES });
    if (!peer) return res.status(404).json({ error: 'Пользователь не найден' });

    const where: Record<string | symbol, unknown> = between(me, peer.id);
    if (typeof req.query.after === 'string' && !Number.isNaN(Date.parse(req.query.after))) {
      where.createdAt = { [Op.gt]: new Date(req.query.after) };
    }

    const messages = await Message.findAll({ where, order: [['createdAt', 'DESC']], limit: 200 });

    await Message.update(
      { readAt: new Date() },
      { where: { senderId: peer.id, recipientId: me, teamId: null, readAt: null } }
    );

    res.json({ peer, messages: messages.reverse() });
  } catch (error) {
    sendError(res, error);
  }
};

export const postDirectMessage = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user.id as string;
    if (req.params.userId === me) {
      return res.status(400).json({ error: 'Нельзя написать самому себе' });
    }

    const peer = await User.findByPk(req.params.userId, { attributes: ['id'] });
    if (!peer) return res.status(404).json({ error: 'Пользователь не найден' });

    const message = await Message.create({
      senderId: me,
      recipientId: peer.id,
      text: String(req.body?.text ?? '').trim(),
    });
    res.status(201).json(message);
  } catch (error) {
    sendError(res, error);
  }
};

/** Сколько всего непрочитанных — для значка в меню */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const unread = await Message.count({
      where: { recipientId: req.user.id, teamId: null, readAt: null },
    });
    res.json({ unread });
  } catch (error) {
    sendError(res, error);
  }
};
