import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

import sequelize from './config/database';
import { applyDataPatches } from './config/patches';
import app from './app';
import { startIotPolling } from './controllers/iotController';
import { startUploadCleanup } from './controllers/uploadController';
import { startNotificationCleanup } from './controllers/notificationController';
import { attachRealtime } from './realtime/hub';

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Схема подтягивается под модели при каждом старте
    if (process.env.DB_SYNC !== 'false') {
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized.');
    }

    await applyDataPatches();
    startIotPolling();
    startUploadCleanup();
    startNotificationCleanup();

    const server = http.createServer(app);
    attachRealtime(server);
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();
