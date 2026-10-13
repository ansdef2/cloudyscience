import { Router } from 'express';
import { blockUser, createReport, getMyBlocks, unblockUser } from '../controllers/safetyController';
import { authenticate } from '../middleware/auth';
import { messageLimiter } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);
router.post('/reports', messageLimiter, createReport);
router.get('/blocks', getMyBlocks);
router.post('/blocks/:id', blockUser);
router.delete('/blocks/:id', unblockUser);

export default router;
