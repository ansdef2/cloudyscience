import { Router } from 'express';
import {
  getChats,
  getDirectMessages,
  postDirectMessage,
  getUnreadCount,
} from '../controllers/chatController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getChats);
router.get('/unread', getUnreadCount);
router.get('/users/:userId/messages', getDirectMessages);
router.post('/users/:userId/messages', postDirectMessage);

export default router;
