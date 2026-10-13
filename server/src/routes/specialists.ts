import { Router } from 'express';
import {
  getAllSpecialists,
  getSpecialistById,
  createSpecialist,
  updateSpecialist,
  deleteSpecialist,
} from '../controllers/specialistController';
import { requestConsultation } from '../controllers/consultationController';
import { authenticate, authorizeAdmin, requireParentConsent } from '../middleware/auth';
import { messageLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/', getAllSpecialists);
router.get('/:id', getSpecialistById);
router.post('/:id/consultations', authenticate, requireParentConsent, messageLimiter, requestConsultation);
router.post('/', authenticate, authorizeAdmin, createSpecialist);
router.put('/:id', authenticate, authorizeAdmin, updateSpecialist);
router.delete('/:id', authenticate, authorizeAdmin, deleteSpecialist);

export default router;
