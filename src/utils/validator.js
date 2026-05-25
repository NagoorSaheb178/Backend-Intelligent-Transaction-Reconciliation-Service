import { z } from 'zod';

/**
 * Zod schema for a raw CSV row.
 * Validates that required fields are present (non-empty strings).
 * Price, fee, and note are optional (transfers often lack price).
 */
export const RawTransactionRowSchema = z.object({
  transaction_id: z.string().min(1, 'transaction_id is required'),
  timestamp: z.string().min(1, 'timestamp is required'),
  type: z.string().min(1, 'type is required'),
  asset: z.string().min(1, 'asset is required'),
  quantity: z.string().min(1, 'quantity is required'),
  price_usd: z.string().optional().default(''),
  fee: z.string().optional().default(''),
  note: z.string().optional().default(''),
});

/**
 * Validate a single CSV record object.
 * Returns { success, data, errors } where errors is an array of { field, reason }.
 *
 * @param {object} record - The raw CSV record object
 * @returns {{ success: boolean, data: object|null, errors: Array<{field: string, reason: string}> }}
 */
export const validateRow = (record) => {
  if (!record || typeof record !== 'object') {
    return {
      success: false,
      data: null,
      errors: [{ field: 'row', reason: 'Row is null or not an object' }],
    };
  }

  const result = RawTransactionRowSchema.safeParse(record);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'unknown',
      reason: issue.message,
    }));
    return { success: false, data: null, errors };
  }

  return { success: true, data: result.data, errors: [] };
};
