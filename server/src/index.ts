import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database';
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin && corsOrigin !== '*' ? { origin: corsOrigin.split(',') } : {}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/specialists', specialistRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start server
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync database (use with caution in production)
    if (process.env.DB_SYNC !== 'false') {
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized.');
    }
    
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();
