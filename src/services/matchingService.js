// src/services/matchingService.js
import Decimal from 'decimal.js';
import { toDecimal } from '../utils/decimal.util.js';
import ReconciliationRun from '../models/ReconciliationRun.js';
import Transaction from '../models/Transaction.js';
import ReconciliationMatch from '../models/ReconciliationMatch.js';
import {
  DEFAULT_TOLERANCES,
  MatchStatus,
  TransactionStatus,
} from '../constants/reconciliation.js';
import logger from '../config/logger.js';

/**
 * Perform deterministic matching for a given reconciliation run.
 * It groups transactions by asset + normalized type and attempts to pair
 * USER and EXCHANGE entries within configurable tolerances.
 *
 * @param {ObjectId} runId - The ReconciliationRun ID
 * @param {Object} [tolerances] - Optional overrides for matching thresholds
 * @returns {Promise<{run: ReconciliationRun, stats: object}>}
 */
export const runMatching = async (runId, tolerances = {}) => {
  const run = await ReconciliationRun.findById(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const {
    timeWindowSeconds,
    quantity,
    priceUsd,
    fee,
  } = { ...DEFAULT_TOLERANCES, ...tolerances };

  // Load all valid pending transactions for this run
  const allTx = await Transaction.find({
    runId,
    isValid: true,
    status: TransactionStatus.PENDING,
  });

  // Index transactions by asset + type for quick lookup
  const groups = new Map();
  for (const tx of allTx) {
    const key = `${tx.normalizedAsset}|${tx.normalizedType}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tx);
  }

  const matchCounters = {
    exact: 0,
    quantityMismatch: 0,
    priceMismatch: 0,
    feeMismatch: 0,
    timestampMismatch: 0,
    unmatchedUser: 0,
    unmatchedExchange: 0,
    total: 0,
  };

  const diff = (a, b) => {
  if (a == null || b == null) return null;
  try {
    // Convert possible Mongo Decimal128 values safely
    return toDecimal(a).minus(toDecimal(b)).abs();
  } catch (e) {
    logger.warn({a,b,error:e},'Decimal diff calculation failed');
    return null;
  }
};

  for (const [key, txs] of groups.entries()) {
    const users = txs.filter((t) => t.source === 'USER');
    const exchanges = txs.filter((t) => t.source === 'EXCHANGE');

    for (const u of users) {
      let bestMatch = null;
      let bestScore = Infinity;

      for (const e of exchanges) {
        if (e.status !== TransactionStatus.PENDING || e.matched) continue;
        const timeDiffSec = Math.abs(
          (new Date(u.normalizedTimestamp) - new Date(e.normalizedTimestamp)) / 1000
        );

        const qtyDiff = diff(u.normalizedQuantity, e.normalizedQuantity);
        if (qtyDiff && qtyDiff.gt(quantity)) continue;
        const priceDiff = diff(u.normalizedPriceUsd, e.normalizedPriceUsd);
        if (priceDiff && priceDiff.gt(priceUsd)) continue;
        const feeDiff = diff(u.normalizedFee, e.normalizedFee);
        if (feeDiff && feeDiff.gt(fee)) continue;
        const score =
          (timeDiffSec || 0) +
          (qtyDiff ? Number(qtyDiff) : 0) +
          (priceDiff ? Number(priceDiff) : 0) +
          (feeDiff ? Number(feeDiff) : 0);
        if (score < bestScore) {
          bestScore = score;
          bestMatch = { e, timeDiffSec, qtyDiff, priceDiff, feeDiff };
        }
      }

      if (bestMatch) {
        const { e, timeDiffSec, qtyDiff, priceDiff, feeDiff } = bestMatch;
         let status = MatchStatus.EXACT_MATCH;
         if (qtyDiff && !qtyDiff.eq(0)) status = MatchStatus.QUANTITY_MISMATCH;
         else if (priceDiff && !priceDiff.eq(0)) status = MatchStatus.PRICE_MISMATCH;
         else if (feeDiff && !feeDiff.eq(0)) status = MatchStatus.FEE_MISMATCH;
         else if (timeDiffSec > timeWindowSeconds) status = MatchStatus.TIMESTAMP_MISMATCH;

        await ReconciliationMatch.create({
          runId,
          status,
          userTransaction: u._id,
          exchangeTransaction: e._id,
          discrepancyDetails: {
            quantityDifference: qtyDiff?.toString() ?? '0',
            priceDifference: priceDiff?.toString() ?? '0',
            feeDifference: feeDiff?.toString() ?? '0',
            timestampDifferenceSeconds: Math.round(timeDiffSec),
          },
          reason: 'Matched via deterministic engine',
        });
        await Transaction.findByIdAndUpdate(u._id, { status: TransactionStatus.MATCHED, matched: true });
        u.status = TransactionStatus.MATCHED;
        u.matched = true;
        await Transaction.findByIdAndUpdate(e._id, { status: TransactionStatus.MATCHED, matched: true });
        e.status = TransactionStatus.MATCHED;
        e.matched = true;
        // Map match status to counter keys
        let counterKey;
        switch (status) {
          case MatchStatus.EXACT_MATCH:
            counterKey = 'exact';
            break;
          case MatchStatus.QUANTITY_MISMATCH:
            counterKey = 'quantityMismatch';
            break;
          case MatchStatus.PRICE_MISMATCH:
            counterKey = 'priceMismatch';
            break;
          case MatchStatus.FEE_MISMATCH:
            counterKey = 'feeMismatch';
            break;
          case MatchStatus.TIMESTAMP_MISMATCH:
            counterKey = 'timestampMismatch';
            break;
          default:
            // For any future statuses, convert to camelCase form
            counterKey = status
              .toLowerCase()
              .replace(/\s+/g, '')
              .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        }
        matchCounters[counterKey] = (matchCounters[counterKey] || 0) + 1;
        matchCounters.total += 1;
      }
    }
  }

  // After matching, compute unmatched transactions directly from MongoDB
  // Compute invalid USER keys to avoid counting their counterpart EXCHANGE as unmatched
  const invalidUserTx = await Transaction.find({
    runId,
    source: 'USER',
    status: TransactionStatus.INVALID,
  });
  const invalidUserKeys = new Set(invalidUserTx.map(t => `${t.normalizedAsset}|${t.normalizedType}`));

  const unmatchedUserTx = await Transaction.find({
    runId,
    source: 'USER',
    status: TransactionStatus.PENDING,
  });
  for (const tx of unmatchedUserTx) {
    await Transaction.findByIdAndUpdate(tx._id, {
      status: TransactionStatus.UNMATCHED,
      matched: false,
    });
    matchCounters.unmatchedUser += 1;
    matchCounters.total += 1;
  }

  const unmatchedExchangeTx = await Transaction.find({
    runId,
    source: 'EXCHANGE',
    status: TransactionStatus.PENDING,
  });
  for (const tx of unmatchedExchangeTx) {
    const key = `${tx.normalizedAsset}|${tx.normalizedType}`;
    if (invalidUserKeys.has(key)) {
      // Skip counting as unmatched because counterpart USER is invalid
      continue;
    }
    await Transaction.findByIdAndUpdate(tx._id, {
      status: TransactionStatus.UNMATCHED,
      matched: false,
    });
    matchCounters.unmatchedExchange += 1;
    matchCounters.total += 1;
  }

  // After matching, compute transaction summary for both sides
  const userAgg = await Transaction.aggregate([
    { $match: { runId, source: 'USER' } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        valid: { $sum: { $cond: [{ $eq: ['$isValid', true] }, 1, 0] } },
        invalid: { $sum: { $cond: [{ $eq: ['$status', 'INVALID'] }, 1, 0] } },
        duplicate: { $sum: { $cond: [{ $gt: [{ $size: { $filter: { input: '$ingestionIssues', as: 'issue', cond: { $regexMatch: { input: '$$issue.reason', regex: /duplicate/i } } } } }, 0] }, 1, 0] } },
        unmatched: { $sum: { $cond: [{ $eq: ['$status', 'UNMATCHED'] }, 1, 0] } }
      },
    },
  ]);
  const exchangeAgg = await Transaction.aggregate([
    { $match: { runId, source: 'EXCHANGE' } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        valid: { $sum: { $cond: [{ $eq: ['$isValid', true] }, 1, 0] } },
        invalid: { $sum: { $cond: [{ $eq: ['$status', 'INVALID'] }, 1, 0] } },
        duplicate: { $sum: { $cond: [{ $gt: [{ $size: { $filter: { input: '$ingestionIssues', as: 'issue', cond: { $regexMatch: { input: '$$issue.reason', regex: /duplicate/i } } } } }, 0] }, 1, 0] } },
        unmatched: { $sum: { $cond: [{ $eq: ['$status', 'UNMATCHED'] }, 1, 0] } }
      },
    },
  ]);
  const userSummary = userAgg[0] || { total:0, valid:0, invalid:0, duplicate:0, unmatched:0 };
  const exchangeSummary = exchangeAgg[0] || { total:0, valid:0, invalid:0, duplicate:0, unmatched:0 };
  logger.info({
    userSummary,
    exchangeSummary,
    matchCounters
  }, 'Summary aggregation counts');
  // Assign aggregated summaries to run
  // Assign aggregated summaries to run
  run.summary.userTransactions = {
    total: userSummary.total,
    valid: userSummary.valid,
    invalid: userSummary.invalid,
    duplicate: userSummary.duplicate,
    unmatched: userSummary.unmatched,
  };
  run.summary.exchangeTransactions = {
    total: exchangeSummary.total,
    valid: exchangeSummary.valid,
    invalid: exchangeSummary.invalid,
    duplicate: exchangeSummary.duplicate,
    unmatched: exchangeSummary.unmatched,
  };
  // Compute correct total of matches from individual counters
  const calculatedTotal =
    (matchCounters.exact || 0) +
    (matchCounters.quantityMismatch || 0) +
    (matchCounters.priceMismatch || 0) +
    (matchCounters.feeMismatch || 0) +
    (matchCounters.timestampMismatch || 0) +
    (matchCounters.unmatchedUser || 0) +
    (matchCounters.unmatchedExchange || 0);

  // Assign matches with corrected total
  run.summary.matches = { ...matchCounters, total: calculatedTotal };
  // Validation: ensure total matches calculated correctly
  if (run.summary.matches.total !== calculatedTotal) {
    logger.error({
      reportedTotal: run.summary.matches.total,
      calculatedTotal,
      matchDetails: run.summary.matches,
    }, 'Invalid reconciliation summary total calculation');
    throw new Error('Invalid reconciliation summary total calculation');
  }
  logger.info({
    exact: run.summary.matches.exact,
    quantityMismatch: run.summary.matches.quantityMismatch,
    priceMismatch: run.summary.matches.priceMismatch,
    feeMismatch: run.summary.matches.feeMismatch,
    unmatchedUser: run.summary.matches.unmatchedUser,
    unmatchedExchange: run.summary.matches.unmatchedExchange,
    calculatedTotal,
  }, 'Reconciliation summary verification');
  await run.save();
}
