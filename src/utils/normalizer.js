import Decimal from 'decimal.js';
import { ASSET_ALIASES, TYPE_MAPPINGS, NormalizedType } from '../constants/reconciliation.js';

/**
 * Normalize asset symbols by trimming, lowercasing and resolving aliases.
 * @param {string} asset 
 * @returns {string|null}
 */
export const normalizeAsset = (asset) => {
  if (!asset) return null;
  const clean = asset.trim().toLowerCase();
  if (ASSET_ALIASES[clean]) {
    return ASSET_ALIASES[clean];
  }
  return asset.trim().toUpperCase();
};

/**
 * Normalize transaction types.
 * @param {string} type 
 * @returns {string}
 */
export const normalizeType = (type) => {
  if (!type) return NormalizedType.UNKNOWN;
  const clean = type.trim().toUpperCase();
  if (TYPE_MAPPINGS[clean]) {
    return TYPE_MAPPINGS[clean];
  }
  return NormalizedType.UNKNOWN;
};

/**
 * Validate and parse a timestamp string into a Date object.
 * @param {string} timestamp 
 * @returns {Date|null}
 */
export const normalizeTimestamp = (timestamp) => {
  if (!timestamp) return null;
  
  const trimmed = timestamp.trim();
  // Basic sanity check: if the timestamp ends with T or has no time portion but has a T, it could be malformed
  if (trimmed.endsWith('T') || trimmed.endsWith('t')) {
    return null;
  }

  const parsed = Date.parse(trimmed);
  if (isNaN(parsed)) {
    return null;
  }

  return new Date(parsed);
};

/**
 * Parse a numeric value into a Decimal.js instance.
 * @param {string|number} value 
 * @returns {Decimal|null}
 */
export const parseDecimal = (value) => {
  if (value === undefined || value === null || value === '') return null;
  try {
    const dec = new Decimal(value.toString().trim());
    if (dec.isNaN()) return null;
    return dec;
  } catch (error) {
    return null;
  }
};
