import os from 'os';
import path from 'path';
import fs from 'fs';

/**
 * Окружение автотестов — подключается первым импортом в каждом файле.
 * Тесты пересоздают таблицы, поэтому работают только с базой *_test:
 * случайный запуск против рабочей базы её не сотрёт.
 */
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'cloudco_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.RATE_LIMIT_DISABLED = 'true';
process.env.DB_SYNC = 'false';
delete process.env.SMTP_HOST;
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudco-uploads-'));

if (!process.env.DB_NAME.endsWith('_test')) {
  throw new Error(`Автотесты стирают базу — укажите тестовую (*_test), а не ${process.env.DB_NAME}`);
}
