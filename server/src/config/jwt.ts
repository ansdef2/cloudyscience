/**
 * Секрет подписи токенов. Раньше при отсутствии переменной подставлялась
 * строка 'secret' из исходников — зная её, кто угодно подписал бы себе
 * токен администратора. В production теперь падаем на старте.
 */
const fromEnv = process.env.JWT_SECRET;

if (!fromEnv && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET не задан. Укажите его в deploy/.env');
}

export const JWT_SECRET = fromEnv || 'dev-only-insecure-secret';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
