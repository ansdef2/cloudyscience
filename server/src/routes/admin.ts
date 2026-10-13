import { Router } from 'express';
import { getAllEnrollments } from '../controllers/courseController';
import {
  createParentConsentLink,
  createResetLink,
  listUsers,
  updateUserByAdmin,
} from '../controllers/adminUserController';
import { listReports, resolveReport } from '../controllers/safetyController';
import { deleteUser } from '../controllers/userController';
import { previewDemo, removeDemo } from '../config/demo';
import { sendError } from '../utils/sendError';
import { authenticate, authorizeAdmin } from '../middleware/auth';

/** Сводки для админки. Брони и заявки отдают свои ручки — админу там видно всё */
const router = Router();

router.use(authenticate, authorizeAdmin);

router.get('/enrollments', getAllEnrollments);
router.get('/users', listUsers);
router.put('/users/:id', updateUserByAdmin);
router.post('/users/:id/reset-link', createResetLink);
router.post('/users/:id/parent-consent-link', createParentConsentLink);
router.delete('/users/:id', deleteUser);
router.get('/reports', listReports);

// Демо-наполнение сида: посмотреть, что будет удалено, и удалить
router.get('/demo', (_req, res) => previewDemo().then((data) => res.json(data), (error) => sendError(res, error)));
router.post('/demo/remove', (_req, res) => removeDemo().then((data) => res.json(data), (error) => sendError(res, error)));
router.put('/reports/:id', resolveReport);

export default router;
