import { Router } from 'express';
import { setStageProgress } from '../controllers/progressController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.put('/stages/:stageId', authenticate, setStageProgress);

export default router;
