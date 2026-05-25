import mongoose from 'mongoose';
import { RunStatus } from '../constants/reconciliation.js';

const ReconciliationRunSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(RunStatus),
      default: RunStatus.PENDING,
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    summary: {
      userTransactions: {
        total: { type: Number, default: 0 },
        valid: { type: Number, default: 0 },
        invalid: { type: Number, default: 0 },
        duplicate: { type: Number, default: 0 },
      },
      exchangeTransactions: {
        total: { type: Number, default: 0 },
        valid: { type: Number, default: 0 },
        invalid: { type: Number, default: 0 },
        duplicate: { type: Number, default: 0 },
      },
      matches: {
        exact: { type: Number, default: 0 },
        quantityMismatch: { type: Number, default: 0 },
        priceMismatch: { type: Number, default: 0 },
        feeMismatch: { type: Number, default: 0 },
        unmatchedUser: { type: Number, default: 0 },
        unmatchedExchange: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('ReconciliationRun', ReconciliationRunSchema);
