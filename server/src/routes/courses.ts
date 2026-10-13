import { Router } from 'express';
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  removeEnrollment,
  getCourseEnrollments,
} from '../controllers/courseController';
import { authenticate } from '../middleware/auth';
import { authorizeAdmin, optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.get('/', getAllCourses);
router.get('/:id', optionalAuthenticate, getCourseById);
router.post('/', authenticate, authorizeAdmin, createCourse);
router.put('/:id', authenticate, authorizeAdmin, updateCourse);
router.delete('/:id', authenticate, authorizeAdmin, deleteCourse);

router.post('/:id/enroll', authenticate, enrollInCourse);
router.get('/:id/enrollments', authenticate, authorizeAdmin, getCourseEnrollments);
router.delete('/:id/enrollments/:userId', authenticate, authorizeAdmin, removeEnrollment);

export default router;
