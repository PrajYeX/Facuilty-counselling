import express from 'express';
import { register, login, getMe, verifyEmail, resendVerification, forgotPassword, resetPassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { requirePhase } from '../middleware/phase.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/register', requirePhase('registration'), register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', protect, resendVerification);
router.post('/forgot-password', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
