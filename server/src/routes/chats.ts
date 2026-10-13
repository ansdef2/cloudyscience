import { Router } from 'express';
import {
  getChats,
  getDirectMessages,
  postDirectMessage,
  getUnreadCount,
} from '../controllers/chatController';
import { authenticate, requireParentConsent } from '../middleware/auth';
import { messageLimiter } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);

router.get('/', getChats);
router.get('/unread', getUnreadCount);
router.get('/users/:userId/messages', getDirectMessages);
router.post('/users/:userId/messages', requireParentConsent, messageLimiter, postDirectMessage);

export default router;
