import { Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { AuthRequest } from '../middleware/auth';
import Booking from '../models/Booking';
import FileUpload from '../models/FileUpload';
import Equipment from '../models/Equipment';
import Message from '../models/Message';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';
import TeamInvitation from '../models/TeamInvitation';
import User from '../models/User';
import { pushTo } from '../realtime/hub';
import { notify } from '../utils/notify';
import { sendError } from '../utils/sendError';
import { isBlockedBetween } from './safetyController';

/** Что о человеке видят другие: без почты и пароля */
export const PUBLIC_USER_ATTRIBUTES = ['id', 'name', 'avatar'];

export const findMembership = (teamId: string, userId: string) =>
  TeamMember.findOne({ where: { teamId, userId } });

const loadTeam = (id: string) =>
  Team.findByPk(id, {
    include: [
      {
        model: TeamMember,
        as: 'members',
        attributes: ['userId', 'role', 'createdAt'],
        include: [{ model: User, attributes: PUBLIC_USER_ATTRIBUTES }],
      },
    ],
    order: [[{ model: TeamMember, as: 'members' }, 'createdAt', 'ASC']],
  });

/** Команды, в которых состоит пользователь */
export const getMyTeams = async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await TeamMember.findAll({ where: { userId: req.user.id } });
    const teamIds = memberships.map((membership) => membership.teamId);

    const teams = await Team.findAll({
      where: { id: { [Op.in]: teamIds } },
      include: [
        {
          model: TeamMember,
          as: 'members',
          attributes: ['userId', 'role'],
          include: [{ model: User, attributes: PUBLIC_USER_ATTRIBUTES }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const roleByTeam = new Map(memberships.map((membership) => [membership.teamId, membership.role]));
    res.json(teams.map((team) => ({ ...team.toJSON(), myRole: roleByTeam.get(team.id) })));
  } catch (error) {
    sendError(res, error);
  }
};

export const createTeam = async (req: AuthRequest, res: Response) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const description = req.body?.description ? String(req.body.description).trim() : null;

    const team = await sequelize.transaction(async (transaction) => {
      const created = await Team.create({ name, description, ownerId: req.user.id }, { transaction });
      await TeamMember.create({ teamId: created.id, userId: req.user.id, role: 'owner' }, { transaction });
      return created;
    });

    const full = await loadTeam(team.id);
    res.status(201).json({ ...full!.toJSON(), myRole: 'owner' });
  } catch (error) {
    sendError(res, error);
  }
};

/** Команда целиком — участникам и администратору */
export const getTeam = async (req: AuthRequest, res: Response) => {
  try {
    const team = await loadTeam(req.params.id);
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });

    const membership = await findMembership(team.id, req.user.id);
    if (!membership && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Вы не состоите в этой команде' });
    }

    res.json({ ...team.toJSON(), myRole: membership?.role ?? null });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateTeam = async (req: AuthRequest, res: Response) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });
    if (team.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Менять команду может только её создатель' });
    }

    const changes: Record<string, unknown> = {};
    if (req.body?.name !== undefined) changes.name = String(req.body.name).trim();
    if (req.body?.description !== undefined) changes.description = String(req.body.description).trim() || null;
    await team.update(changes);

    const full = await loadTeam(team.id);
    res.json(full);
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteTeam = async (req: AuthRequest, res: Response) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });
    if (team.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Удалить команду может только её создатель' });
    }

    await team.destroy();
    res.json({ message: 'Команда удалена' });
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * Пригласить в команду — создатель зовёт человека из поиска обучающихся.
 * В команду человек попадает, только когда сам примет приглашение.
 */
export const inviteMember = async (req: AuthRequest, res: Response) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });
    if (team.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Приглашать может только создатель команды' });
    }

    const user = await User.findByPk(req.body?.userId, {
      attributes: ['id', 'name', 'isBlocked', 'parentConsentStatus'],
    });
    if (!user || user.isBlocked || user.parentConsentStatus === 'pending') {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (user.id === req.user.id) return res.status(400).json({ error: 'Вы уже в команде' });
    if (await isBlockedBetween(req.user.id, user.id)) {
      return res.status(403).json({ error: 'Этого человека нельзя пригласить' });
    }
    if (await findMembership(team.id, user.id)) return res.status(409).json({ error: 'Уже в команде' });

    const existing = await TeamInvitation.findOne({
      where: { teamId: team.id, inviteeId: user.id, status: 'pending' },
    });
    if (existing) return res.status(409).json({ error: 'Приглашение уже отправлено' });

    const invitation = await TeamInvitation.create({
      teamId: team.id,
      inviterId: req.user.id,
      inviteeId: user.id,
    });

    await notify(
      user.id,
      {
        type: 'team_invitation',
        title: `Приглашение в команду «${team.name}»`,
        body: `${req.user.name} зовёт вас в исследовательскую команду`,
        link: '/teams',
      },
      { email: true }
    );

    res.status(201).json({ id: invitation.id, status: invitation.status, invitee: { id: user.id, name: user.name } });
  } catch (error) {
    sendError(res, error);
  }
};

/** Мои входящие приглашения */
export const getMyInvitations = async (req: AuthRequest, res: Response) => {
  try {
    const invitations = await TeamInvitation.findAll({
      where: { inviteeId: req.user.id, status: 'pending' },
      include: [
        { model: Team, attributes: ['id', 'name', 'description'] },
        { model: User, as: 'inviter', attributes: PUBLIC_USER_ATTRIBUTES },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(invitations);
  } catch (error) {
    sendError(res, error);
  }
};

/** Ожидающие приглашения команды — её создателю */
export const getTeamInvitations = async (req: AuthRequest, res: Response) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });
    if (team.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Приглашения видит создатель команды' });
    }
    const invitations = await TeamInvitation.findAll({
      where: { teamId: team.id, status: 'pending' },
      include: [{ model: User, as: 'invitee', attributes: PUBLIC_USER_ATTRIBUTES }],
      order: [['createdAt', 'DESC']],
    });
    res.json(invitations);
  } catch (error) {
    sendError(res, error);
  }
};

/** Принять или отклонить приглашение */
export const respondInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const accept = req.params.action === 'accept';
    const invitation = await TeamInvitation.findByPk(req.params.invitationId, { include: [{ model: Team }] });
    if (!invitation || invitation.inviteeId !== req.user.id) {
      return res.status(404).json({ error: 'Приглашение не найдено' });
    }
    if (invitation.status !== 'pending') return res.status(409).json({ error: 'Приглашение уже неактуально' });

    const team = (invitation as any).Team as Team | null;
    if (!team) return res.status(410).json({ error: 'Команды больше нет' });

    await sequelize.transaction(async (transaction) => {
      await invitation.update({ status: accept ? 'accepted' : 'declined' }, { transaction });
      if (accept) {
        await TeamMember.findOrCreate({
          where: { teamId: team.id, userId: req.user.id },
          defaults: { teamId: team.id, userId: req.user.id, role: 'member' },
          transaction,
        });
      }
    });

    await notify(team.ownerId, {
      type: accept ? 'team_invitation_accepted' : 'team_invitation_declined',
      title: accept ? `${req.user.name} теперь в команде «${team.name}»` : `${req.user.name} отклонил(а) приглашение`,
      link: `/teams/${team.id}`,
    });

    res.json({ status: invitation.status, teamId: team.id });
  } catch (error) {
    sendError(res, error);
  }
};

/** Создатель отзывает приглашение */
export const cancelInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team || team.ownerId !== req.user.id) return res.status(404).json({ error: 'Команда не найдена' });
    const updated = await TeamInvitation.update(
      { status: 'cancelled' },
      { where: { id: req.params.invitationId, teamId: team.id, status: 'pending' } }
    );
    if (!updated[0]) return res.status(404).json({ error: 'Приглашение не найдено' });
    res.json({ status: 'cancelled' });
  } catch (error) {
    sendError(res, error);
  }
};

/** Убрать участника (создатель) или выйти самому (участник) */
export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });

    const { userId } = req.params;
    const isOwner = team.ownerId === req.user.id;
    if (!isOwner && userId !== req.user.id) {
      return res.status(403).json({ error: 'Убирать участников может только создатель команды' });
    }
    if (userId === team.ownerId) {
      return res.status(400).json({ error: 'Создатель не может выйти — удалите команду' });
    }

    const removed = await TeamMember.destroy({ where: { teamId: team.id, userId } });
    if (!removed) return res.status(404).json({ error: 'Такого участника нет' });

    res.json({ message: 'Участник удалён' });
  } catch (error) {
    sendError(res, error);
  }
};

/** Сообщения командного чата. ?after=ISO — только новые, для опроса */
export const getTeamMessages = async (req: AuthRequest, res: Response) => {
  try {
    const membership = await findMembership(req.params.id, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Вы не состоите в этой команде' });

    const where: Record<string | symbol, unknown> = { teamId: req.params.id };
    if (typeof req.query.after === 'string' && !Number.isNaN(Date.parse(req.query.after))) {
      where.createdAt = { [Op.gt]: new Date(req.query.after) };
    }

    const messages = await Message.findAll({
      where,
      include: [{ model: User, as: 'sender', attributes: PUBLIC_USER_ATTRIBUTES }],
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    res.json(messages.reverse());
  } catch (error) {
    sendError(res, error);
  }
};

export const postTeamMessage = async (req: AuthRequest, res: Response) => {
  try {
    const membership = await findMembership(req.params.id, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Вы не состоите в этой команде' });

    const message = await Message.create({
      senderId: req.user.id,
      teamId: req.params.id,
      text: String(req.body?.text ?? '').trim(),
    });
    const full = await Message.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: PUBLIC_USER_ATTRIBUTES }],
    });

    const members = await TeamMember.findAll({ where: { teamId: req.params.id }, attributes: ['userId'] });
    pushTo(
      members.map((member) => member.userId),
      { type: 'message', kind: 'team', chatId: req.params.id, message: full!.toJSON() }
    );

    res.status(201).json(full);
  } catch (error) {
    sendError(res, error);
  }
};

/** Брони команды — видны всем участникам */
export const getTeamBookings = async (req: AuthRequest, res: Response) => {
  try {
    const membership = await findMembership(req.params.id, req.user.id);
    if (!membership && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Вы не состоите в этой команде' });
    }

    const bookings = await Booking.findAll({
      where: { teamId: req.params.id },
      include: [
        { model: Equipment },
        { model: Team, attributes: ['id', 'name'] },
        { model: User, attributes: PUBLIC_USER_ATTRIBUTES },
        { model: FileUpload, as: 'uploads', attributes: ['id', 'originalName', 'size', 'createdAt'] },
      ],
      order: [['date', 'DESC']],
    });
    res.json(bookings);
  } catch (error) {
    sendError(res, error);
  }
};
