import { Router } from 'express';
import {
  getAllPosts,
  getPostById,
  likePost,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/postController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.post('/:id/like', likePost);
// Публикует и правит ленту только администратор: иначе любой мог
// выложить пост, в том числе в «Актуальное» на главной
router.post('/', authenticate, authorizeAdmin, createPost);
router.put('/:id', authenticate, authorizeAdmin, updatePost);
router.delete('/:id', authenticate, authorizeAdmin, deletePost);

export default router;
