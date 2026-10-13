import { Router } from 'express';
import {
  getChannels,
  getAllChannelsAdmin,
  createChannel,
  updateChannel,
  deleteChannel,
  receiveWebhook,
  refreshChannelHandler,
} from '../controllers/iotController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

// Статус устройств для карточки оборудования
router.get('/channels', getChannels);

// Вход для провайдеров: защищён токеном канала, а не входом пользователя
router.post('/webhook/:id', receiveWebhook);

router.get('/admin/channels', authenticate, authorizeAdmin, getAllChannelsAdmin);
router.post('/channels', authenticate, authorizeAdmin, createChannel);
router.put('/channels/:id', authenticate, authorizeAdmin, updateChannel);
router.delete('/channels/:id', authenticate, authorizeAdmin, deleteChannel);
router.post('/channels/:id/refresh', authenticate, authorizeAdmin, refreshChannelHandler);

export default router;
