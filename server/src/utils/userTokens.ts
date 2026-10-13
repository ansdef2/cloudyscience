import crypto from 'crypto';
import { Op } from 'sequelize';
import UserToken, { UserTokenPurpose } from '../models/UserToken';

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const LIFETIME: Record<UserTokenPurpose, number> = {
  password_reset: 60 * 60 * 1000,
  parent_consent: 14 * 24 * 60 * 60 * 1000,
};

/** Новая одноразовая ссылка; прежние ссылки того же назначения перестают работать */
export const issueToken = async (userId: string, purpose: UserTokenPurpose) => {
  await UserToken.update(
    { usedAt: new Date() },
    { where: { userId, purpose, usedAt: null } }
  );
  const token = crypto.randomBytes(32).toString('hex');
  await UserToken.create({
    userId,
    purpose,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + LIFETIME[purpose]),
  });
  return token;
};

/** Действующая ссылка или null — просроченная, использованная, чужого назначения */
export const findValidToken = async (token: unknown, purpose: UserTokenPurpose) => {
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return null;
  return UserToken.findOne({
    where: { tokenHash: hash(token), purpose, usedAt: null, expiresAt: { [Op.gt]: new Date() } },
  });
};
