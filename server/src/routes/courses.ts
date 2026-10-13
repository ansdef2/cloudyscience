import { Router } from 'express';
import {
  createModule,
  createStage,
  deleteModule,
  deleteStage,
  updateModule,
  updateStage,
} from '../controllers/courseContentController';
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
import { authorizeAdmin, optionalAuthenticate, requireParentConsent } from '../middleware/auth';

const router = Router();

router.get('/', getAllCourses);
router.get('/:id', optionalAuthenticate, getCourseById);
router.post('/', authenticate, authorizeAdmin, createCourse);
router.put('/:id', authenticate, authorizeAdmin, updateCourse);
router.delete('/:id', authenticate, authorizeAdmin, deleteCourse);

// Содержание курса — модули и этапы
router.post('/:id/modules', authenticate, authorizeAdmin, createModule);
router.put('/modules/:moduleId', authenticate, authorizeAdmin, updateModule);
router.delete('/modules/:moduleId', authenticate, authorizeAdmin, deleteModule);
router.post('/modules/:moduleId/stages', authenticate, authorizeAdmin, createStage);
router.put('/stages/:stageId', authenticate, authorizeAdmin, updateStage);
router.delete('/stages/:stageId', authenticate, authorizeAdmin, deleteStage);

router.post('/:id/enroll', authenticate, requireParentConsent, enrollInCourse);
router.get('/:id/enrollments', authenticate, authorizeAdmin, getCourseEnrollments);
router.delete('/:id/enrollments/:userId', authenticate, authorizeAdmin, removeEnrollment);

export default router;
