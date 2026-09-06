import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Управляемые БД (в том числе Timeweb Cloud) принимают только TLS-подключения
 * и часто отдают сертификат собственного центра сертификации. DB_SSL=true
 * включает шифрование, DB_SSL_REJECT_UNAUTHORIZED=false разрешает такой
 * сертификат — понадобится, если корневой сертификат провайдера не установлен.
 */
const useSsl = process.env.DB_SSL === 'true';
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'cloudco',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized } } : {},
});

export default sequelize;
