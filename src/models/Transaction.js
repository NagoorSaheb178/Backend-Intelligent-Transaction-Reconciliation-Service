import mongoose from 'mongoose';
import { SourceType, TransactionStatus, NormalizedType } from '../constants/reconciliation.js';

const IngestionIssueSchema = new mongoose.Schema({
  field: { type: String },
  value: { type: String },
  reason: { type: String, required: true },
});

const TransactionSchema = new mongoose.Schema(
  {
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReconciliationRun',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: Object.values(SourceType),
      required: true,
      index: true,
    },
    // Raw columns from CSV
    rawId: { type: String },
    rawTimestamp: { type: String },
    rawType: { type: String },
    rawAsset: { type: String },
    rawQuantity: { type: String },
    rawPriceUsd: { type: String },
    rawFee: { type: String },
    rawNote: { type: String },

    // Normalized values
    normalizedTimestamp: { type: Date, index: true },
    normalizedType: {
      type: String,
      enum: Object.values(NormalizedType),
    },
    normalizedAsset: { type: String, index: true },
    normalizedQuantity: { type: mongoose.Schema.Types.Decimal128 },
    normalizedPriceUsd: { type: mongoose.Schema.Types.Decimal128 },
    normalizedFee: { type: mongoose.Schema.Types.Decimal128 },

    isValid: {
      type: Boolean,
      default: true,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      required: true,
      index: true,
    },
    ingestionIssues: [IngestionIssueSchema],
  },
  {
    timestamps: true,
  }
);

// Enable JSON transform to serialize Decimal128 values cleanly as strings
TransactionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    if (ret.normalizedQuantity) ret.normalizedQuantity = ret.normalizedQuantity.toString();
    if (ret.normalizedPriceUsd) ret.normalizedPriceUsd = ret.normalizedPriceUsd.toString();
    if (ret.normalizedFee) ret.normalizedFee = ret.normalizedFee.toString();
    return ret;
  },
});

export default mongoose.model('Transaction', TransactionSchema);
