import './env';
import http from 'http';
import { AddressInfo } from 'net';
import sequelize from '../src/config/database';
import app from '../src/app';
import { attachRealtime } from '../src/realtime/hub';
import Course from '../src/models/Course';
import Equipment from '../src/models/Equipment';
import Institution from '../src/models/Institution';
import User from '../src/models/User';
import { hashPassword } from '../src/utils/hashPassword';
import { addDays, siteNow } from '../src/utils/schedule';

export interface Response<T = any> {
  status: number;
  body: T;
}

let base = '';
let server: http.Server | null = null;

/** Чистая база и сервер на свободном порту */
export const start = async () => {
  await sequelize.sync({ force: true });
  server = http.createServer(app);
  attachRealtime(server);
  await new Promise<void>((resolve) => server!.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  return base;
};

export const stop = async () => {
  await new Promise((resolve) => server?.close(resolve));
  await sequelize.close();
};

export const call = async <T = any>(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<Response<T>> => {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // не JSON — например, скачанный файл
  }
  return { status: response.status, body: parsed };
};

/** Отправить файл multipart-формой — call() шлёт только JSON */
export const upload = async (token: string, name: string, content: string, path = '/uploads') => {
  const form = new FormData();
  form.append('file', new Blob([content]), name);
  const response = await fetch(base + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: response.status, body: await response.json() };
};

let counter = 0;

/** Зарегистрировать взрослого пользователя через API */
export const register = async (name: string, extra: Record<string, unknown> = {}) => {
  counter += 1;
  const { status, body } = await call('POST', '/auth/register', {
    email: `user${counter}-${Date.now()}@test.ru`,
    password: 'password123',
    name,
    birthDate: '2000-05-05',
    consent: true,
    ...extra,
  });
  if (status !== 201) throw new Error(`Регистрация ${name}: ${status} ${JSON.stringify(body)}`);
  return body as { token: string; user: { id: string; email: string; name: string } };
};

export const makeAdmin = async () => {
  await User.create({
    email: 'admin@test.ru',
    password: await hashPassword('admin-password'),
    name: 'Админ',
    role: 'admin',
  });
  const { body } = await call('POST', '/auth/login', { email: 'admin@test.ru', password: 'admin-password' });
  return body as { token: string; user: { id: string } };
};

/** Учреждение, оборудование 10:00–18:00 и курс на 3 места */
export const makeCatalog = async () => {
  const institution = await Institution.create({
    name: 'Тестовый кванториум',
    address: 'Большая Московская ул., 1',
    workingHours: '9:00-19:00',
    phone: '+7 000 000-00-00',
  });
  const equipment = await Equipment.create({
    institutionId: institution.id,
    name: '3D-принтер',
    workingHours: '10:00-18:00',
    isOpen: true,
  });
  const course = await Course.create({
    institutionId: institution.id,
    title: 'Тестовый курс',
    direction: 'IT',
    totalSpots: 3,
    availableSpots: 3,
  });
  return { institution, equipment, course };
};

/** Дата через n дней по времени площадок — будущий день для брони */
export const futureDate = (days = 3) => addDays(siteNow().date, days);
