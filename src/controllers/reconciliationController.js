// src/controllers/reconciliationController.js
import path from 'path';
import fs from 'fs';
import { ingestCsv } from '../services/ingestionService.js';
import { runMatching } from '../services/matchingService.js';
import ReconciliationRun from '../models/ReconciliationRun.js';
import Transaction from '../models/Transaction.js';
import logger from '../config/logger.js';


/**
 * POST /api/reconcile
 * Body: { userCsvPath, exchangeCsvPath }
 */
export const reconcile = async (req, res) => {
  const userFile = req.files?.['userFile']?.[0];
  const exchangeFile = req.files?.['exchangeFile']?.[0];
  if (!userFile || !exchangeFile) {
    return res.status(400).json({ error: 'Both userFile and exchangeFile are required' });
  }

  try {
    // Create a single run for both uploads
    const run = await ReconciliationRun.create({ status: 'RUNNING' });
    // Ingest both CSV files under same run
    await ingestCsv(userFile.path, 'USER', run._id);
    await ingestCsv(exchangeFile.path, 'EXCHANGE', run._id);

    // Run matching engine
    await runMatching(run._id);

    // Cleanup uploaded files
    try {
      fs.unlinkSync(userFile.path);
      fs.unlinkSync(exchangeFile.path);
    } catch (e) {
      logger.warn({ err: e }, 'Failed to delete uploaded files');
    }

    // Return updated run summary
    const updated = await ReconciliationRun.findById(run._id);
    res.json({ runId: run._id, status: updated.status, summary: updated.summary });
  } catch (err) {
    logger.error({ err }, 'Reconciliation error');
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/report/:runId/summary
 */
import ReconciliationMatch from '../models/ReconciliationMatch.js';

export const getRunSummary = async (req, res) => {
  const { runId } = req.params;
  const run = await ReconciliationRun.findById(runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  // Return the summary object stored in the run document
  res.json({
    runId,
    status: run.status,
    summary: run.summary,
  });
};

/**
 * GET /api/report/:runId/unmatched
 */
export const getUnmatched = async (req, res) => {
  const { runId } = req.params;
  // Invalid ingestion rows (status INVALID)
  const invalidTransactions = await Transaction.find({
    runId,
    status: 'INVALID',
  }).lean();
  // Unmatched after matching (status UNMATCHED)
  const unmatchedTransactions = await Transaction.find({
    runId,
    status: 'UNMATCHED',
  }).lean();
  res.json({ invalidTransactions, unmatchedTransactions });
};;

/**
 * GET /api/report/:runId (CSV download)
 */
export const streamReportCsv = async (req, res) => {
  const { runId } = req.params;
  // Initialize cursor for match documents
  const cursor = (await import('../models/ReconciliationMatch.js')).default.find({ runId }).cursor();

  // Set CSV response headers
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="reconciliation_${runId}.csv"`);

  // Write CSV header line
  const header = [
    'runId',
    'status',
    'userTransactionId',
    'exchangeTransactionId',
    'quantityDifference',
    'priceDifference',
    'feeDifference',
    'timestampDifferenceSeconds',
    'reason',
  ].join(',') + '\n';
  res.write(header);

  // Helper to safely convert Decimal128 (or other types) to plain numbers/strings
  const toPlain = (val) => {
    if (val == null) return '';
    // Mongoose Decimal128 instances have a toString method that yields the numeric string
    if (typeof val === 'object' && typeof val.toString === 'function') {
      return val.toString();
    }
    return val;
  };

  // Process each document asynchronously and ensure the stream is fully flushed before ending the response
  try {
    for await (const doc of cursor) {
      const line = [
        doc.runId,
        doc.status,
        doc.userTransaction?.toString() ?? '',
        doc.exchangeTransaction?.toString() ?? '',
        toPlain(doc.discrepancyDetails?.quantityDifference),
        toPlain(doc.discrepancyDetails?.priceDifference),
        toPlain(doc.discrepancyDetails?.feeDifference),
        toPlain(doc.discrepancyDetails?.timestampDifferenceSeconds),
        `"${doc.reason ?? ''}"`,
      ].join(',') + '\n';
      // Write each line; `res.write` returns a boolean indicating if the buffer is full. Await drain if needed.
      if (!res.write(line)) {
        await new Promise((resolve) => res.once('drain', resolve));
      }
    }
    // All rows processed – end response
    res.end();
  } catch (err) {
    logger.error({ err }, 'Error streaming CSV');
    // In case of error, attempt to cleanly end the response with an error status
    if (!res.headersSent) {
      res.status(500).setHeader('Content-Type', 'application/json');
    }
    res.end();
  }
};
