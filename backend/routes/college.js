import express from 'express';
import { protect, isCollege } from '../middleware/auth.js';
import { getCollegeOverview, markReporting } from '../controllers/collegeController.js';

const router = express.Router();

router.use(protect);
router.use(isCollege);

router.get('/overview', getCollegeOverview);
router.put('/allotments/:id/reporting', markReporting);

export default router;
