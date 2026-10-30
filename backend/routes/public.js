import express from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import { getCategories, getSeatMatrix, getCutoffs, lookupRank } from '../controllers/publicController.js';

// No login needed: published information, like KCET's public lists.
const router = express.Router();

router.get('/categories', getCategories);
router.get('/seat-matrix', getSeatMatrix);
router.get('/cutoffs', getCutoffs);
router.post('/rank-lookup', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), lookupRank);

export default router;
