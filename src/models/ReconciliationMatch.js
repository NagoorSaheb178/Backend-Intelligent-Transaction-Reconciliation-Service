import mongoose from 'mongoose';
import { MatchStatus } from '../constants/reconciliation.js';

const ReconciliationMatchSchema = new mongoose.Schema(
  {
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReconciliationRun',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(MatchStatus),
      required: true,
      index: true,
    },
    userTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true,
    },
    exchangeTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true,
    },
    discrepancyDetails: {
      quantityDifference: { type: mongoose.Schema.Types.Decimal128 },
      priceDifference: { type: mongoose.Schema.Types.Decimal128 },
      feeDifference: { type: mongoose.Schema.Types.Decimal128 },
      timestampDifferenceSeconds: { type: Number },
    },
    reason: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ReconciliationMatchSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    if (ret.discrepancyDetails) {
      if (ret.discrepancyDetails.quantityDifference) {
        ret.discrepancyDetails.quantityDifference = ret.discrepancyDetails.quantityDifference.toString();
      }
      if (ret.discrepancyDetails.priceDifference) {
        ret.discrepancyDetails.priceDifference = ret.discrepancyDetails.priceDifference.toString();
      }
      if (ret.discrepancyDetails.feeDifference) {
        ret.discrepancyDetails.feeDifference = ret.discrepancyDetails.feeDifference.toString();
      }
    }
    return ret;
  },
});

export default mongoose.model('ReconciliationMatch', ReconciliationMatchSchema);
