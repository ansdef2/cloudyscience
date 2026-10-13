import { Router } from 'express';
import { getAllEnrollments } from '../controllers/courseController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

/** Сводки для админки. Брони и заявки отдают свои ручки — админу там видно всё */
const router = Router();

router.use(authenticate, authorizeAdmin);

router.get('/enrollments', getAllEnrollments);

export default router;
