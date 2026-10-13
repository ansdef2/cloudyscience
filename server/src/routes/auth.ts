import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  acceptConsent,
  forgotPassword,
  resetPassword,
  getParentConsent,
  confirmParentConsent,
  resendParentConsent,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { loginLimiter, passwordResetLimiter, registerLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/profile', authenticate, getProfile);
router.post('/consent', authenticate, acceptConsent);
router.post('/forgot', passwordResetLimiter, forgotPassword);
router.post('/reset', passwordResetLimiter, resetPassword);
router.get('/parent-consent', getParentConsent);
router.post('/parent-consent', passwordResetLimiter, confirmParentConsent);
router.post('/parent-consent/resend', authenticate, passwordResetLimiter, resendParentConsent);

export default router;
