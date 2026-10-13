import { Router } from 'express';
import {
  getAllUsers,
  getDirectory,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getAllUsers);
router.get('/directory', authenticate, getDirectory);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, updateUser);
router.delete('/:id', authenticate, deleteUser);

export default router;
