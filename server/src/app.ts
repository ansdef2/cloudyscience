import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// Регистрирует ассоциации моделей (в т.ч. алиас Institution.courses) — без этого include падает
import './models';
import authRoutes from './routes/auth';
import institutionRoutes from './routes/institutions';
import courseRoutes from './routes/courses';
import equipmentRoutes from './routes/equipment';
import bookingRoutes from './routes/bookings';
import userRoutes from './routes/users';
import searchRoutes from './routes/search';
import postRoutes from './routes/posts';
import specialistRoutes from './routes/specialists';
import progressRoutes from './routes/progress';
import iotRoutes from './routes/iot';
import teamRoutes from './routes/teams';
import chatRoutes from './routes/chats';
import consultationRoutes from './routes/consultations';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/uploads';
import notificationRoutes from './routes/notifications';
import safetyRoutes from './routes/safety';
import { servePublicFile } from './controllers/uploadController';
import { apiLimiter } from './middleware/rateLimit';

/**
 * Express-приложение без запуска: index.ts поднимает его на порту,
 * автотесты — на случайном.
 */
const app = express();

// Перед бэкендом стоит Caddy: настоящий адрес клиента — в X-Forwarded-For
app.set('trust proxy', 1);
app.disable('x-powered-by');

const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin && corsOrigin !== '*' ? { origin: corsOrigin.split(',') } : {}));
// Картинки из /api/files встраиваются в страницы сайта — разрешаем их своему сайту
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/specialists', specialistRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/safety', safetyRoutes);
app.get('/api/files/:name', servePublicFile);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Необработанная ошибка: в ответ — без подробностей, подробности — в лог
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Слишком большой запрос' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON' });
  console.error(err?.stack ?? err);
  res.status(err?.status || 500).json({ error: err?.status ? err.message : 'Internal Server Error' });
});

export default app;
