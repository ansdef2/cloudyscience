import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt';

/** v — версия пароля: после смены пароля старые токены не принимаются */
export const generateToken = (user: { id: string; tokenVersion?: number }): string => {
  return jwt.sign({ userId: user.id, v: user.tokenVersion ?? 0 }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};
