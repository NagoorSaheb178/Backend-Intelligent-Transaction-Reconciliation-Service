import Decimal from 'decimal.js';

/**
 * Safely convert a value (including MongoDB Decimal128) to a Decimal.js instance.
 * @param {*} value - The value to convert. Can be a number, string, Decimal128 object, or Decimal.js instance.
 * @returns {Decimal} - Decimal.js instance (defaults to 0 on falsy/invalid input).
 */
export const toDecimal = (value) => {
  try {
    if (value === undefined || value === null) return new Decimal(0);
    // Handle MongoDB Decimal128 representation
    if (typeof value === 'object' && value !== null && '$numberDecimal' in value) {
      return new Decimal(value['$numberDecimal']);
    }
    // If it's already a Decimal.js instance
    if (value instanceof Decimal) return value;
    // Fallback to string conversion
    return new Decimal(value.toString().trim());
  } catch (error) {
    // Log conversion failure but keep execution alive
    // eslint-disable-next-line no-console
    console.warn({ value, error: error.message }, 'Decimal conversion failed');
    return new Decimal(0);
  }
};
