import { Router } from 'express';
import { getNotifications, markAllRead, markRead } from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getNotifications);
router.post('/read-all', markAllRead);
router.post('/:id/read', markRead);

export default router;
