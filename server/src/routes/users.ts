import { Router } from 'express';
import {
  getAllUsers,
  getDirectory,
  getUserById,
  updateUser,
  deleteUser,
  uploadAvatar,
  removeAvatar,
  deleteMe,
} from '../controllers/userController';
import { changePassword, logoutEverywhere, updateMe } from '../controllers/authController';
import { receiveImage } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/', authenticate, getAllUsers);
router.get('/directory', authenticate, getDirectory);
router.put('/me', authenticate, updateMe);
router.put('/me/password', authenticate, changePassword);
router.post('/me/logout-all', authenticate, logoutEverywhere);
router.post('/me/avatar', authenticate, uploadLimiter, receiveImage, uploadAvatar);
router.delete('/me/avatar', authenticate, removeAvatar);
router.delete('/me', authenticate, deleteMe);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, updateUser);
router.delete('/:id', authenticate, deleteUser);

export default router;
