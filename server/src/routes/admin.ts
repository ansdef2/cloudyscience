import { Router } from 'express';
import { getAllEnrollments } from '../controllers/courseController';
import {
  createParentConsentLink,
  createResetLink,
  listUsers,
  updateUserByAdmin,
} from '../controllers/adminUserController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

/** Сводки для админки. Брони и заявки отдают свои ручки — админу там видно всё */
const router = Router();

router.use(authenticate, authorizeAdmin);

router.get('/enrollments', getAllEnrollments);
router.get('/users', listUsers);
router.put('/users/:id', updateUserByAdmin);
router.post('/users/:id/reset-link', createResetLink);
router.post('/users/:id/parent-consent-link', createParentConsentLink);

export default router;
