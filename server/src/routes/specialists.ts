import { Router } from 'express';
import {
  getAllSpecialists,
  getSpecialistById,
  createSpecialist,
  updateSpecialist,
  deleteSpecialist,
} from '../controllers/specialistController';
import { requestConsultation } from '../controllers/consultationController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getAllSpecialists);
router.get('/:id', getSpecialistById);
router.post('/:id/consultations', authenticate, requestConsultation);
router.post('/', authenticate, authorizeAdmin, createSpecialist);
router.put('/:id', authenticate, authorizeAdmin, updateSpecialist);
router.delete('/:id', authenticate, authorizeAdmin, deleteSpecialist);

export default router;
