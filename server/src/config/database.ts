import fs from 'fs';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

/**
 * TLS до базы. Управляемые БД (в том числе Timeweb Cloud) принимают только
 * шифрованные подключения и отдают сертификат собственного центра сертификации.
 *
 * DB_SSL=true                       — включить шифрование
 * DB_SSL_CA=/путь/до/root.crt       — корневой сертификат провайдера;
 *                                     с ним сертификат сервера проверяется
 *                                     по-настоящему (аналог sslmode=verify-full)
 * DB_SSL_REJECT_UNAUTHORIZED=false  — принять сертификат без проверки;
 *                                     запасной вариант, если файла CA нет
 */
const buildSslOptions = () => {
  if (process.env.DB_SSL !== 'true') {
    return {};
  }

  const caPath = process.env.DB_SSL_CA;

  if (caPath) {
    if (!fs.existsSync(caPath)) {
      throw new Error(
        `DB_SSL_CA указывает на несуществующий файл: ${caPath}. ` +
          'Скачайте корневой сертификат провайдера или уберите переменную.'
      );
    }

    return { ssl: { require: true, rejectUnauthorized: true, ca: fs.readFileSync(caPath, 'utf8') } };
  }

  return {
    ssl: { require: true, rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' },
  };
};

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'cloudco',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: buildSslOptions(),
});

export default sequelize;
