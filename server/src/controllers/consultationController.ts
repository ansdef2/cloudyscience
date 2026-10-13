import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ConsultationRequest from '../models/ConsultationRequest';
import Institution from '../models/Institution';
import Specialist from '../models/Specialist';
import User from '../models/User';
import { sendError } from '../utils/sendError';

const STATUSES = ['new', 'confirmed', 'done', 'cancelled'] as const;

const withDetails = (isAdmin: boolean) => [
  { model: Specialist, include: [{ model: Institution, attributes: ['id', 'name', 'address'] }] },
  // Почту заявителя видит только администратор — ему с человеком связываться
  { model: User, attributes: isAdmin ? ['id', 'name', 'email'] : ['id', 'name'] },
];

/** Записаться на консультацию к эксперту */
export const requestConsultation = async (req: AuthRequest, res: Response) => {
  try {
    const specialist = await Specialist.findByPk(req.params.id);
    if (!specialist) return res.status(404).json({ error: 'Эксперт не найден' });

    const { message, preferredDate, preferredTime } = req.body ?? {};
    if (preferredTime && !/^\d{2}:\d{2}$/.test(String(preferredTime))) {
      return res.status(400).json({ error: 'Время — в формате ЧЧ:ММ' });
    }

    const request = await ConsultationRequest.create({
      userId: req.user.id,
      specialistId: specialist.id,
      message: message ? String(message).trim() : null,
      preferredDate: preferredDate || null,
      preferredTime: preferredTime || null,
    });

    const full = await ConsultationRequest.findByPk(request.id, { include: withDetails(false) });
    res.status(201).json(full);
  } catch (error) {
    sendError(res, error);
  }
};

/** Свои заявки; администратору — все */
export const getConsultations = async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const requests = await ConsultationRequest.findAll({
      where: isAdmin ? {} : { userId: req.user.id },
      include: withDetails(isAdmin),
      order: [['createdAt', 'DESC']],
    });
    res.json(requests);
  } catch (error) {
    sendError(res, error);
  }
};

/** Статус меняет администратор; заявитель может только отменить свою */
export const updateConsultation = async (req: AuthRequest, res: Response) => {
  try {
    const request = await ConsultationRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ error: 'Заявка не найдена' });

    const status = req.body?.status;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `status: одно из ${STATUSES.join(', ')}` });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwnCancel = request.userId === req.user.id && status === 'cancelled';
    if (!isAdmin && !isOwnCancel) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    await request.update({ status });
    const full = await ConsultationRequest.findByPk(request.id, { include: withDetails(isAdmin) });
    res.json(full);
  } catch (error) {
    sendError(res, error);
  }
};
