import { parseDecimal, normalizeAsset, normalizeTimestamp, normalizeType } from '../utils/normalizer.js';
import { validateRow } from '../utils/validator.js';
import Transaction from '../models/Transaction.js';
import ReconciliationRun from '../models/ReconciliationRun.js';
import logger from '../config/logger.js';

/**
 * Process a CSV file for a given source (USER or EXCHANGE).
 * Creates a new ReconciliationRun entry, validates each row, normalizes values,
 * stores raw and normalized data, and records any ingestion issues.
 *
 * @param {string} filePath - absolute path to CSV file
 * @param {'USER'|'EXCHANGE'} source - source identifier
 * @returns {Promise<ReconciliationRun>} the persisted run document with summary statistics
 */
export const ingestCsv = async (filePath, source, existingRunId) => {
  const run = existingRunId ? await ReconciliationRun.findById(existingRunId) : await ReconciliationRun.create({ status: 'RUNNING' });
  const { parseCSV } = await import('../utils/csvParser.js');
  const rows = await parseCSV(filePath);

  let summary = {
    total: rows.length,
    valid: 0,
    invalid: 0,
    duplicate: 0,
  };

  const seenIds = new Set();

  for (const { record, rowIndex, parseError } of rows) {
    // Prepare base transaction document
    const base = {
      runId: run._id,
      source,
      rawId: record?.transaction_id ?? null,
      rawTimestamp: record?.timestamp ?? null,
      rawType: record?.type ?? null,
      rawAsset: record?.asset ?? null,
      rawQuantity: record?.quantity ?? null,
      rawPriceUsd: record?.price_usd ?? null,
      rawFee: record?.fee ?? null,
      rawNote: record?.note ?? null,
    };

    const issues = [];
    let isValid = true;
    // Parse errors from csv-parse itself
    if (parseError) {
      issues.push({ field: 'parse', value: null, reason: parseError });
      isValid = false;
    }

    // Duplicate ID detection
    if (record && record.transaction_id) {
      if (seenIds.has(record.transaction_id)) {
        issues.push({ field: 'transaction_id', value: record.transaction_id, reason: 'Duplicate transaction_id' });
        isValid = false;
        summary.duplicate += 1;
      } else {
        seenIds.add(record.transaction_id);
      }
    }

    // Zod validation
    const validation = validateRow(record || {});
    if (!validation.success) {
      for (const err of validation.errors) {
        issues.push({ field: err.field, value: record?.[err.field] ?? null, reason: err.reason });
      }
      isValid = false;
    }

    // Normalization (only if basic validation passed)
    if (isValid && validation.success) {
      const normAsset = normalizeAsset(record.asset);
      const normType = normalizeType(record.type);
      const normTimestamp = normalizeTimestamp(record.timestamp);
      const normQuantity = parseDecimal(record.quantity);
      const normPrice = parseDecimal(record.price_usd);
      const normFee = parseDecimal(record.fee);

      if (!normAsset) {
        issues.push({ field: 'asset', value: record.asset, reason: 'Unable to normalize asset' });
        isValid = false;
      }
      if (!normTimestamp) {
        issues.push({ field: 'timestamp', value: record.timestamp, reason: 'Invalid timestamp format' });
        isValid = false;
      }
      if (!normQuantity) {
        issues.push({ field: 'quantity', value: record.quantity, reason: 'Invalid numeric quantity' });
        isValid = false;
      }

      // Store normalized values (null is allowed for price/fee when not applicable)
      base.normalizedTimestamp = normTimestamp;
      base.normalizedAsset = normAsset;
      base.normalizedType = normType;
      base.normalizedQuantity = normQuantity ? normQuantity.toString() : null;
      base.normalizedPriceUsd = normPrice ? normPrice.toString() : null;
      base.normalizedFee = normFee ? normFee.toString() : null;
    }

    base.isValid = isValid;
    base.status = isValid ? 'PENDING' : 'INVALID';
    base.ingestionIssues = issues;

    try {
      await Transaction.create(base);
      if (isValid) summary.valid += 1; else summary.invalid += 1;
    } catch (err) {
      logger.error({ err, rowIndex }, 'Failed to save transaction');
    }
  }

  // Update run summary
  run.status = 'COMPLETED';
  run.completedAt = new Date();
  run.summary = {
    userTransactions: {}, // Will be filled by controller after both sources are processed
    exchangeTransactions: {},
    matches: {},
  };
  // Store raw counts for later aggregation (source-specific will be computed later)
  run.rawCounts = run.rawCounts || {};
  run.rawCounts[source] = { total: summary.total, valid: summary.valid, invalid: summary.invalid, duplicate: summary.duplicate };
  await run.save();

  logger.info({ runId: run._id, source, summary }, 'CSV ingestion completed');
  return run;
};
