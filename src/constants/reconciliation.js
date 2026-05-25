export const SourceType = {
  USER: 'USER',
  EXCHANGE: 'EXCHANGE',
};

export const TransactionStatus = {
  PENDING: 'PENDING',
  MATCHED: 'MATCHED',
  UNMATCHED: 'UNMATCHED',
  INVALID: 'INVALID',
  DUPLICATE: 'DUPLICATE',
};

export const MatchStatus = {
  EXACT_MATCH: 'EXACT_MATCH',
  QUANTITY_MISMATCH: 'QUANTITY_MISMATCH',
  PRICE_MISMATCH: 'PRICE_MISMATCH',
  FEE_MISMATCH: 'FEE_MISMATCH',
  TIMESTAMP_MISMATCH: 'TIMESTAMP_MISMATCH',
  UNMATCHED_USER: 'UNMATCHED_USER',
  UNMATCHED_EXCHANGE: 'UNMATCHED_EXCHANGE',
};

export const RunStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

export const NormalizedType = {
  TRADE: 'TRADE',
  TRANSFER: 'TRANSFER',
  UNKNOWN: 'UNKNOWN',
};

export const ASSET_ALIASES = {
  'bitcoin': 'BTC',
  'ether': 'ETH',
  'ethereum': 'ETH',
  'tether': 'USDT',
  'solana': 'SOL',
  'polygon': 'MATIC',
  'chainlink': 'LINK',
};

export const TYPE_MAPPINGS = {
  // User Types
  'BUY': NormalizedType.TRADE,
  'SELL': NormalizedType.TRADE,
  'TRANSFER_OUT': NormalizedType.TRANSFER,
  'TRANSFER_IN': NormalizedType.TRANSFER,
  
  // Exchange Types
  'TRANSFER': NormalizedType.TRANSFER,
};

// Tolerances for reconciliation comparisons
export const DEFAULT_TOLERANCES = {
  timeWindowSeconds: 60, // 60 seconds time window
  quantity: 0.0001,      // Quantity threshold difference
  priceUsd: 0.01,        // Price threshold difference
  fee: 0.001,            // Fee threshold difference
};
