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
import User from '../models/User';
import { sendError } from '../utils/sendError';

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

/** Добавить участника — создатель команды добавляет человека из поиска обучающихся */
export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });
    if (team.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Добавлять участников может только создатель команды' });
    }

    const user = await User.findByPk(req.body?.userId, { attributes: PUBLIC_USER_ATTRIBUTES });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const [, created] = await TeamMember.findOrCreate({
      where: { teamId: team.id, userId: user.id },
      defaults: { teamId: team.id, userId: user.id, role: 'member' },
    });
    if (!created) return res.status(409).json({ error: 'Уже в команде' });

    const full = await loadTeam(team.id);
    res.status(201).json(full);
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
