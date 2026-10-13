import { Router } from 'express';
import { getConsultations, updateConsultation } from '../controllers/consultationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getConsultations);
router.put('/:id', authenticate, updateConsultation);

export default router;
