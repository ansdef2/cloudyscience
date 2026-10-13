import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { JWT_SECRET } from '../config/jwt';

export interface AuthRequest extends Request {
  user?: any;
}

/** Пользователь по токену или null: подпись, срок, версия пароля, блокировка */
export const userFromToken = async (token?: string | null) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; v?: number };
    const user = await User.findByPk(decoded.userId);
    if (!user || (decoded.v ?? 0) !== (user.tokenVersion ?? 0)) return null;
    return user;
  } catch {
    return null;
  }
};

const bearer = (req: Request) => req.headers.authorization?.split(' ')[1];

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = bearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await userFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (user.isBlocked) {
    return res.status(403).json({
      error: user.blockedReason ? `Аккаунт заблокирован: ${user.blockedReason}` : 'Аккаунт заблокирован',
      code: 'BLOCKED',
    });
  }

  req.user = user;
  next();
};

export const authorizeAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

/**
 * Общение и брони — только после согласия родителя для детей до 14 лет.
 * Смотреть каталог, курсы и ленту можно и без него.
 */
export const requireParentConsent = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.parentConsentStatus === 'pending') {
    return res.status(403).json({
      error: 'Нужно согласие родителя. Мы отправили письмо на почту, которую вы указали при регистрации',
      code: 'PARENT_CONSENT_REQUIRED',
    });
  }
  next();
};

/**
 * Не требует входа, но если токен есть — подставляет пользователя.
 * Нужно там, где страница открыта всем, а часть данных личная.
 */
export const optionalAuthenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const user = await userFromToken(bearer(req));
  // Просроченный или чужой токен для гостевой страницы не ошибка
  if (user && !user.isBlocked) req.user = user;
  next();
};
