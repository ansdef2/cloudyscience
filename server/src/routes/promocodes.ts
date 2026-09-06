import { Router } from 'express';
import {
  getAllPromocodes,
  getPromocodeById,
  claimPromocode,
  createPromocode,
  deletePromocode,
} from '../controllers/promocodeController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getAllPromocodes);
router.post('/claim', claimPromocode);
router.get('/:id', getPromocodeById);
router.post('/', authenticate, authorizeAdmin, createPromocode);
router.delete('/:id', authenticate, authorizeAdmin, deletePromocode);

export default router;
