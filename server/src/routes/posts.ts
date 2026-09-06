import { Router } from 'express';
import {
  getAllPosts,
  getPostById,
  likePost,
  createPost,
  deletePost,
} from '../controllers/postController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.post('/:id/like', likePost);
router.post('/', authenticate, createPost);
router.delete('/:id', authenticate, deletePost);

export default router;
