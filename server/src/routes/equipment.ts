import { Router } from 'express';
import {
  getAllEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getAvailability,
} from '../controllers/equipmentController';
import { authenticate } from '../middleware/auth';
import { authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getAllEquipment);
router.get('/:id', getEquipmentById);
router.get('/:id/availability', getAvailability);
router.post('/', authenticate, authorizeAdmin, createEquipment);
router.put('/:id', authenticate, authorizeAdmin, updateEquipment);
router.delete('/:id', authenticate, authorizeAdmin, deleteEquipment);

export default router;
