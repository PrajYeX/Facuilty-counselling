import express from 'express';
import multer from 'multer';
import { protect, isAdmin } from '../middleware/auth.js';
import {
  getDashboardStats,
  addCollege,
  getColleges,
  updateCollege,
  deleteCollege,
  addScoringCriteria,
  getScoringCriteria,
  updateScoringCriteria,
  deleteScoringCriteria,
  getFacultyList,
  verifyFaculty,
  reviewDocument,
  calculateScores,
  generateMeritList,
  getMeritList,
  getTieBreakers,
  updateTieBreakers,
  getCategories,
  updateCategories
} from '../controllers/adminController.js';
import { exportMeritList, getAnalytics, getAuditLog } from '../controllers/reportsController.js';
import { importColleges, getImportTemplate } from '../controllers/importController.js';
import { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcementController.js';
import { listCollegeAccounts, createCollegeAccount, deleteCollegeAccount } from '../controllers/collegeController.js';
import {
  getScheduleStatus,
  updateSchedule,
  getRounds,
  runRound,
  undoRound,
  resetCounselling,
  getAllotmentResults,
  getSeatMatrix
} from '../controllers/counsellingController.js';
import { getDepartments } from '../controllers/facultyController.js';

const router = express.Router();
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5000000 } });

// Apply auth and admin middleware to all admin routes
router.use(protect);
router.use(isAdmin);

// Dashboard
router.get('/dashboard-stats', getDashboardStats);
router.get('/dashboard', getDashboardStats);

// Colleges
router.route('/colleges')
  .post(addCollege)
  .get(getColleges);

router.route('/colleges/:id')
  .put(updateCollege)
  .delete(deleteCollege);

router.post('/colleges/import', importUpload.single('file'), importColleges);
router.get('/colleges/import-template', getImportTemplate);
router.post('/colleges/:id/accounts', createCollegeAccount);
router.get('/college-accounts', listCollegeAccounts);
router.delete('/college-accounts/:userId', deleteCollegeAccount);

router.route('/categories')
  .get(getCategories)
  .put(updateCategories);

router.get('/departments', getDepartments);
router.get('/seat-matrix', getSeatMatrix);

// Counselling schedule
router.route('/schedule')
  .get(getScheduleStatus)
  .put(updateSchedule);

// Scoring Criteria (both /scoring-criteria and /criteria supported)
router.route('/scoring-criteria')
  .post(addScoringCriteria)
  .get(getScoringCriteria);

router.route('/scoring-criteria/:id')
  .put(updateScoringCriteria)
  .delete(deleteScoringCriteria);

router.route('/criteria')
  .post(addScoringCriteria)
  .get(getScoringCriteria);

router.route('/criteria/:id')
  .put(updateScoringCriteria)
  .delete(deleteScoringCriteria);

// Faculty Management
router.get('/faculty-list', getFacultyList);
router.get('/faculty', getFacultyList);
router.put('/verify-faculty/:id', verifyFaculty);
router.put('/faculty/:id/verify', verifyFaculty);
router.put('/faculty/:id/documents/:docId', reviewDocument);

// Allotment Process
router.post('/calculate-scores', calculateScores);
router.post('/process/calculate-scores', calculateScores);

router.post('/generate-merit-list', generateMeritList);
router.post('/process/generate-merit-list', generateMeritList);
router.get('/merit-list', getMeritList);
router.get('/merit-list/export', exportMeritList);

router.route('/tie-breakers')
  .get(getTieBreakers)
  .put(updateTieBreakers);

// Counselling rounds: mock, round1, round2, extended
router.route('/rounds')
  .get(getRounds)
  .post(runRound);
router.post('/rounds/:id/undo', undoRound);
router.post('/counselling/reset', resetCounselling);

// Runs the next pending round
router.post('/run-allotment', runRound);
router.post('/process/run-allotment', runRound);

router.get('/allotment-results', getAllotmentResults);
router.get('/process/results', getAllotmentResults);

// Reports & transparency
router.get('/analytics', getAnalytics);
router.get('/audit-log', getAuditLog);

// Announcements
router.route('/announcements')
  .get(listAnnouncements)
  .post(createAnnouncement);
router.route('/announcements/:id')
  .put(updateAnnouncement)
  .delete(deleteAnnouncement);

export default router;
