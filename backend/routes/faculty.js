import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect, isFaculty, requireVerifiedEmail } from '../middleware/auth.js';
import { requirePhase } from '../middleware/phase.js';
import {
  getProfile,
  updateProfile,
  uploadDocuments,
  reuploadDocument,
  getMyScore,
  getAvailableSeats,
  getMyOptions,
  saveMyOptions,
  getAllotmentStatus,
  submitChoice,
  downloadAllotmentOrder,
  getDepartments
} from '../controllers/facultyController.js';
import { getScheduleStatus } from '../controllers/counsellingController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5000000 } // 5MB limit
});

// Apply auth and faculty middleware
router.use(protect);
router.use(isFaculty);

router.get('/schedule', getScheduleStatus);
router.get('/departments', getDepartments);

router.route('/profile')
  .get(getProfile)
  .put(requirePhase('registration'), updateProfile);

router.post('/upload-documents', requireVerifiedEmail, requirePhase('registration'), upload.single('file'), uploadDocuments);
router.post('/documents', requireVerifiedEmail, requirePhase('registration'), upload.single('file'), uploadDocuments);
router.put('/documents/:docId', requireVerifiedEmail, requirePhase('registration', 'verification'), upload.single('file'), reuploadDocument);

router.route('/options')
  .get(getMyOptions)
  .put(requireVerifiedEmail, requirePhase('option_entry'), saveMyOptions);
router.get('/options/available', getAvailableSeats);

router.get('/my-score', getMyScore);
router.get('/score', getMyScore);

router.get('/allotment-status', getAllotmentStatus);
router.get('/allotment', getAllotmentStatus);
router.post('/allotment/choice', requirePhase('choices'), submitChoice);
router.get('/allotment/order.pdf', downloadAllotmentOrder);

export default router;
