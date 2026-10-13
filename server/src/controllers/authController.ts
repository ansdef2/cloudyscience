import { Request, Response } from 'express';
import { fn, col, where as sqlWhere } from 'sequelize';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { hashPassword, comparePassword } from '../utils/hashPassword';
import { generateToken } from '../utils/generateToken';
import { sendError } from '../utils/sendError';
import { isMailConfigured, sendMail, siteUrl } from '../utils/mailer';
import { findValidToken, issueToken } from '../utils/userTokens';
import { selfView } from '../utils/userView';
import { isIsoDate, siteNow } from '../utils/schedule';
import { MIN_PASSWORD_LENGTH, PARENT_CONSENT_AGE, POLICY_VERSION } from '../config/legal';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/** Поиск по почте без учёта регистра: старые аккаунты могли сохраниться с заглавными */
export const findByEmail = (email: string) =>
  User.findOne({ where: sqlWhere(fn('lower', col('email')), email) });

/** Полных лет на сегодня (по времени площадок) */
export const ageOn = (birthDate: string, today = siteNow().date) => {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
};

const passwordProblem = (password: unknown) =>
  typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH
    ? `Пароль — не короче ${MIN_PASSWORD_LENGTH} символов`
    : password.length > 200
      ? 'Слишком длинный пароль'
      : null;

/** Письмо родителю со ссылкой согласия; true — ушло */
export const sendParentConsentLetter = async (user: User) => {
  if (!user.parentEmail) return false;
  const token = await issueToken(user.id, 'parent_consent');
  const sent = await sendMail({
    to: user.parentEmail,
    subject: `Согласие на участие ребёнка в «Облаке науки»`,
    paragraphs: [
      `Здравствуйте${user.parentName ? `, ${user.parentName}` : ''}!`,
      `${user.name} зарегистрировался(-лась) на платформе «Облако науки» (${siteUrl()}) и указал(а) вас как родителя или законного представителя.`,
      `Ребёнку младше ${PARENT_CONSENT_AGE} лет нужно ваше согласие на обработку персональных данных. Пока его нет, ребёнок может смотреть каталог и курсы, но не может переписываться, вступать в команды и бронировать оборудование.`,
      'Перед согласием прочитайте политику конфиденциальности и пользовательское соглашение — ссылки есть на странице подтверждения. Если вы не знаете, о ком речь, просто проигнорируйте письмо.',
    ],
    action: { label: 'Перейти к согласию', url: `${siteUrl()}/consent?token=${token}` },
  });
  return { sent, token };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { password, birthDate, consent, parentName, parentEmail } = req.body ?? {};
    const email = normalizeEmail(req.body?.email);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Заполните имя, почту и пароль' });
    }
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Некорректная почта' });
    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Имя — от 2 до 80 символов' });

    const weak = passwordProblem(password);
    if (weak) return res.status(400).json({ error: weak });

    // Без согласия с политикой и соглашением аккаунт не создаётся (152-ФЗ)
    if (consent !== true) {
      return res.status(400).json({
        error: 'Нужно согласие с политикой конфиденциальности и пользовательским соглашением',
        code: 'CONSENT_REQUIRED',
      });
    }

    if (!isIsoDate(birthDate)) return res.status(400).json({ error: 'Укажите дату рождения' });
    const age = ageOn(birthDate);
    if (age < 5 || age > 120) return res.status(400).json({ error: 'Проверьте дату рождения' });

    const isChild = age < PARENT_CONSENT_AGE;
    const parentMail = normalizeEmail(parentEmail);
    if (isChild) {
      if (!parentMail || !EMAIL_RE.test(parentMail)) {
        return res.status(400).json({
          error: `До ${PARENT_CONSENT_AGE} лет нужна почта родителя: мы попросим его согласие`,
          code: 'PARENT_REQUIRED',
        });
      }
      if (parentMail === email) {
        return res.status(400).json({ error: 'Почта родителя должна отличаться от вашей' });
      }
    }

    if (await findByEmail(email)) {
      return res.status(400).json({ error: 'Аккаунт с такой почтой уже есть' });
    }

    const user = await User.create({
      email,
      password: await hashPassword(password),
      name,
      birthDate,
      consentAt: new Date(),
      consentVersion: POLICY_VERSION,
      parentName: isChild && typeof parentName === 'string' ? parentName.trim().slice(0, 120) || null : null,
      parentEmail: isChild ? parentMail : null,
      parentConsentStatus: isChild ? 'pending' : 'not_required',
    });

    let parentLetterSent = false;
    if (isChild) {
      const result = await sendParentConsentLetter(user);
      parentLetterSent = !!result && result.sent;
    }

    res.status(201).json({
      user: selfView(user),
      token: generateToken(user),
      ...(isChild ? { parentLetterSent } : {}),
    });
  } catch (error: any) {
    sendError(res, error);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findByEmail(email);
    if (!user || !(await comparePassword(String(password), user.password))) {
      return res.status(401).json({ error: 'Неверная почта или пароль' });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        error: user.blockedReason ? `Аккаунт заблокирован: ${user.blockedReason}` : 'Аккаунт заблокирован',
        code: 'BLOCKED',
      });
    }

    res.json({ user: selfView(user), token: generateToken(user) });
  } catch (error: any) {
    sendError(res, error);
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    res.json(selfView(req.user));
  } catch (error: any) {
    sendError(res, error);
  }
};

/** Принять текущую редакцию политики — для аккаунтов, созданных до согласий */
export const acceptConsent = async (req: AuthRequest, res: Response) => {
  try {
    await req.user.update({ consentAt: new Date(), consentVersion: POLICY_VERSION });
    res.json(selfView(req.user));
  } catch (error: any) {
    sendError(res, error);
  }
};

/**
 * Забыли пароль. Ответ одинаковый, есть такая почта или нет, —
 * иначе по нему можно перебирать, кто зарегистрирован.
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Некорректная почта' });

    const user = await findByEmail(email);
    if (user && !user.isBlocked) {
      const token = await issueToken(user.id, 'password_reset');
      await sendMail({
        to: user.email,
        subject: 'Сброс пароля в «Облаке науки»',
        paragraphs: [
          `Здравствуйте, ${user.name}!`,
          'Кто-то (надеемся, вы) попросил сбросить пароль. Ссылка действует час и сработает один раз.',
          'Если вы не просили — ничего не делайте, пароль останется прежним.',
        ],
        action: { label: 'Задать новый пароль', url: `${siteUrl()}/reset?token=${token}` },
      });
    }

    res.json({
      message: 'Если такая почта зарегистрирована, мы отправили на неё ссылку для сброса пароля',
      mailConfigured: isMailConfigured(),
    });
  } catch (error: any) {
    sendError(res, error);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const record = await findValidToken(req.body?.token, 'password_reset');
    if (!record) {
      return res.status(400).json({ error: 'Ссылка устарела или уже использована. Запросите новую', code: 'TOKEN_INVALID' });
    }

    const weak = passwordProblem(req.body?.password);
    if (weak) return res.status(400).json({ error: weak });

    const user = await User.findByPk(record.userId);
    if (!user) return res.status(400).json({ error: 'Аккаунт не найден', code: 'TOKEN_INVALID' });

    // Новая версия пароля выкидывает все прежние входы — в том числе чужие
    await user.update({ password: await hashPassword(req.body.password), tokenVersion: user.tokenVersion + 1 });
    await record.update({ usedAt: new Date() });

    res.json({ message: 'Пароль изменён. Войдите с новым паролем' });
  } catch (error: any) {
    sendError(res, error);
  }
};

/** Что показать родителю на странице согласия (без входа) */
export const getParentConsent = async (req: Request, res: Response) => {
  try {
    const record = await findValidToken(req.query.token, 'parent_consent');
    const user = record && (await User.findByPk(record.userId));
    if (!user) return res.status(404).json({ error: 'Ссылка устарела или уже использована', code: 'TOKEN_INVALID' });

    res.json({ childName: user.name, parentName: user.parentName, status: user.parentConsentStatus });
  } catch (error: any) {
    sendError(res, error);
  }
};

export const confirmParentConsent = async (req: Request, res: Response) => {
  try {
    const record = await findValidToken(req.body?.token, 'parent_consent');
    const user = record && (await User.findByPk(record.userId));
    if (!record || !user) {
      return res.status(400).json({ error: 'Ссылка устарела или уже использована', code: 'TOKEN_INVALID' });
    }
    if (req.body?.agree !== true) return res.status(400).json({ error: 'Подтвердите согласие' });

    await user.update({ parentConsentStatus: 'confirmed', parentConsentAt: new Date() });
    await record.update({ usedAt: new Date() });
    res.json({ message: `Спасибо! ${user.name} может пользоваться платформой полностью` });
  } catch (error: any) {
    sendError(res, error);
  }
};

/** Ребёнок просит отправить письмо родителю ещё раз */
export const resendParentConsent = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user.parentConsentStatus !== 'pending') {
      return res.status(400).json({ error: 'Согласие родителя не требуется или уже получено' });
    }
    const result = await sendParentConsentLetter(req.user);
    res.json({ sent: !!result && result.sent, mailConfigured: isMailConfigured() });
  } catch (error: any) {
    sendError(res, error);
  }
};

/** Свой профиль: имя (почта меняется только через администратора) */
export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : undefined;
    if (name !== undefined && (name.length < 2 || name.length > 80)) {
      return res.status(400).json({ error: 'Имя — от 2 до 80 символов' });
    }
    if (name !== undefined) await req.user.update({ name });
    res.json(selfView(req.user));
  } catch (error: any) {
    sendError(res, error);
  }
};

/** Смена пароля — только с текущим: украденный токен не даёт угнать аккаунт */
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string' || !(await comparePassword(currentPassword, req.user.password))) {
      return res.status(400).json({ error: 'Текущий пароль указан неверно' });
    }
    const weak = passwordProblem(newPassword);
    if (weak) return res.status(400).json({ error: weak });

    await req.user.update({ password: await hashPassword(newPassword), tokenVersion: req.user.tokenVersion + 1 });
    // Другие устройства выйдут, а этому — свежий токен
    res.json({ message: 'Пароль изменён', token: generateToken(req.user) });
  } catch (error: any) {
    sendError(res, error);
  }
};

/** Выйти на всех устройствах: прежние токены перестают действовать, этому — новый */
export const logoutEverywhere = async (req: AuthRequest, res: Response) => {
  try {
    await req.user.update({ tokenVersion: req.user.tokenVersion + 1 });
    res.json({ token: generateToken(req.user) });
  } catch (error: any) {
    sendError(res, error);
  }
};
