import User from '../models/User';

/** Свой профиль: всё, что человеку нужно знать о своём аккаунте, без хеша пароля */
export const selfView = (user: User) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatar: user.avatar ?? null,
  role: user.role,
  birthDate: user.birthDate ?? null,
  consentAt: user.consentAt ?? null,
  consentVersion: user.consentVersion ?? null,
  parentConsentStatus: user.parentConsentStatus,
  parentEmail: user.parentEmail ?? null,
  createdAt: user.createdAt,
});

/** Для администратора — плюс блокировка и данные родителя */
export const adminView = (user: User) => ({
  ...selfView(user),
  parentName: user.parentName ?? null,
  parentConsentAt: user.parentConsentAt ?? null,
  isBlocked: user.isBlocked,
  blockedReason: user.blockedReason ?? null,
});
