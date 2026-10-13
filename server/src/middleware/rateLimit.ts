import rateLimit, { Options } from 'express-rate-limit';
import { AuthRequest } from './auth';

/**
 * Ограничение частоты запросов — от перебора паролей, спама в чатах
 * и регистраций ботами. В автотестах выключается RATE_LIMIT_DISABLED=true.
 */
const limiter = (options: Partial<Options>) =>
  rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => process.env.RATE_LIMIT_DISABLED === 'true',
    ...options,
  });

const tooMany = (message: string) => ({ error: message, code: 'RATE_LIMITED' });

/** Ключ — пользователь, если вошёл, иначе адрес */
const byUser = (req: AuthRequest) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip ?? ''}`);

export const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: tooMany('Слишком много попыток входа. Подождите 15 минут'),
});

export const registerLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: tooMany('Слишком много регистраций с этого адреса. Попробуйте через час'),
});

export const passwordResetLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: tooMany('Слишком много запросов на сброс пароля. Попробуйте через час'),
});

export const messageLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: byUser,
  message: tooMany('Слишком часто. Подождите минуту'),
});

export const uploadLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 100,
  keyGenerator: byUser,
  message: tooMany('Слишком много загрузок. Попробуйте позже'),
});

/** Общий потолок на весь API — защита от простого флуда */
export const apiLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 600,
  message: tooMany('Слишком много запросов. Подождите минуту'),
});
