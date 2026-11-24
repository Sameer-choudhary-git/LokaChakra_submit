export interface ApiError extends Error {
  status?: number;
  code?: string;
}

export interface BlockchainError extends Error {
  code?: string;
  txId?: string;
}

export interface ValidationError extends Error {
  field?: string;
  value?: unknown;
}
