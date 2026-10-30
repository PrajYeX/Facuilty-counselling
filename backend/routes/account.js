import express from 'express';
import { protect } from '../middleware/auth.js';
import { listAnnouncements, listNotifications, markNotificationsRead } from '../controllers/announcementController.js';

// Shared by every signed-in role.
const router = express.Router();

router.use(protect);

router.get('/announcements', listAnnouncements);
router.get('/notifications', listNotifications);
router.post('/notifications/read', markNotificationsRead);

export default router;
