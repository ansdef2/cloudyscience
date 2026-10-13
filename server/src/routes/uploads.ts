import { Router } from 'express';
import {
  deleteFile,
  downloadFile,
  receiveBookingFile,
  receiveImage,
  uploadBookingFile,
  uploadImage,
} from '../controllers/uploadController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, receiveBookingFile, uploadBookingFile);
router.post('/images', authenticate, authorizeAdmin, receiveImage, uploadImage);
router.get('/:id', authenticate, downloadFile);
router.delete('/:id', authenticate, deleteFile);

export default router;
