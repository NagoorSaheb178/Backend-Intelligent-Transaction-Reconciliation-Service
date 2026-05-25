// src/routes/reconciliationRoutes.js
import { Router } from 'express';
import { upload } from '../middleware/upload.middleware.js';
import {
  reconcile,
  getRunSummary,
  getUnmatched,
  streamReportCsv,
} from '../controllers/reconciliationController.js';

const router = Router();

// Health endpoint already handled elsewhere

// GET info for /reconcile (helps browser GET requests)
router.get('/reconcile', (req, res) => {
  res.json({
    message: 'Use POST /api/reconcile with multipart/form-data (fields: userFile, exchangeFile) to run reconciliation.',
  });
});

// POST with file upload
router.post(
  '/reconcile',
  upload.fields([
    { name: 'userFile', maxCount: 1 },
    { name: 'exchangeFile', maxCount: 1 },
  ]),
  reconcile
);

// Get summary stats for a run
router.get('/report/:runId/summary', getRunSummary);

// List unmatched or invalid transactions
router.get('/report/:runId/unmatched', getUnmatched);

// Download reconciliation report as CSV
router.get('/report/:runId', streamReportCsv);

export default router;
