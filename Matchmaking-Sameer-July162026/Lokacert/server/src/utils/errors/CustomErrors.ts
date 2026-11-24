/**
 * Custom Error Classes for Production-Grade Error Handling
 * 
 * This file defines all custom error types used throughout the application.
 * Each error class extends AppError and has specific use cases.
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public errorCode: string;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// CLIENT ERROR CLASSES (4xx)
// ============================================================================

/**
 * 400 - Bad Request / Validation Error
 * Use when: Input data is invalid or malformed
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * 401 - Unauthorized
 * Use when: Authentication is required but not provided
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * 403 - Forbidden
 * Use when: User is authenticated but doesn't have permission
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 404 - Not Found
 * Use when: Requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier?: string
  ) {
    const message = identifier 
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 409 - Conflict
 * Use when: Resource already exists or state conflict
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * 422 - Unprocessable Entity
 * Use when: Request is well-formed but semantically incorrect
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string) {
    super(message, 422, 'UNPROCESSABLE_ENTITY');
  }
}

/**
 * 429 - Too Many Requests
 * Use when: Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Too many requests',
    public retryAfter?: number
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

// ============================================================================
// SERVER ERROR CLASSES (5xx)
// ============================================================================

/**
 * 500 - Internal Server Error
 * Use when: Unexpected server error (programming bugs)
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR', false); // Not operational!
  }
}

/**
 * 503 - Service Unavailable
 * Use when: Service is temporarily unavailable (maintenance, overload)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

// ============================================================================
// BLOCKCHAIN-SPECIFIC ERROR CLASSES
// ============================================================================

/**
 * Base class for all blockchain-related errors
 */
export class BlockchainError extends AppError {
  constructor(
    message: string,
    public txSignature?: string,
    public programErrorCode?: number,
    statusCode: number = 500
  ) {
    super(message, statusCode, 'BLOCKCHAIN_ERROR');
  }
}

/**
 * Solana Transaction Errors
 * Use when: Transaction simulation or execution fails
 */
export class SolanaTransactionError extends BlockchainError {
  constructor(
    message: string,
    public txSignature?: string,
    public logs?: string[],
    public instructionIndex?: number
  ) {
    super(message, txSignature);
    this.errorCode = 'SOLANA_TX_FAILED';
  }
}

/**
 * Anchor Program Errors
 * Use when: Smart contract returns an error code
 */
export class AnchorProgramError extends BlockchainError {
  constructor(
    message: string,
    programErrorCode: number,
    public programId?: string
  ) {
    super(message, undefined, programErrorCode, 400); // 400 because it's often a client issue
    this.errorCode = 'ANCHOR_PROGRAM_ERROR';
  }
}

/**
 * Blockchain Network Errors
 * Use when: RPC node is down or network issues
 */
export class BlockchainNetworkError extends BlockchainError {
  constructor(
    message: string,
    public rpcEndpoint?: string
  ) {
    super(message);
    this.errorCode = 'BLOCKCHAIN_NETWORK_ERROR';
  }
}

/**
 * Account/PDA-related Errors
 * Use when: Account doesn't exist or is invalid
 */
export class AccountError extends BlockchainError {
  constructor(
    message: string,
    public accountAddress?: string
  ) {
    super(message, undefined, undefined, 404);
    this.errorCode = 'ACCOUNT_ERROR';
  }
}

/**
 * Insufficient Balance Error
 * Use when: User doesn't have enough SOL for transaction
 */
export class InsufficientBalanceError extends BlockchainError {
  constructor(
    message: string = 'Insufficient SOL balance for transaction fees',
    public requiredBalance?: number,
    public currentBalance?: number
  ) {
    super(message, undefined, undefined, 402); // Payment Required
    this.errorCode = 'INSUFFICIENT_BALANCE';
  }
}

// ============================================================================
// ARWEAVE-SPECIFIC ERROR CLASSES
// ============================================================================

/**
 * Arweave Upload Errors
 * Use when: Arweave upload fails
 */
export class ArweaveError extends AppError {
  constructor(
    message: string,
    public arweaveId?: string
  ) {
    super(message, 500, 'ARWEAVE_ERROR');
  }
}

// ============================================================================
// DATABASE ERROR CLASSES
// ============================================================================

/**
 * Database Errors
 * Use when: Database operations fail
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    public operation?: string
  ) {
    super(message, 500, 'DATABASE_ERROR', false); // Not operational
  }
}

// ============================================================================
// EXTERNAL SERVICE ERROR CLASSES
// ============================================================================

/**
 * External API Errors
 * Use when: Third-party API calls fail
 */
export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    public service: string,
    public statusCode: number = 503
  ) {
    super(message, statusCode, 'EXTERNAL_SERVICE_ERROR');
  }
}

/**
 * Email Service Errors
 * Use when: Email sending fails
 */
export class EmailError extends ExternalServiceError {
  constructor(message: string) {
    super(message, 'EmailService', 500);
    this.errorCode = 'EMAIL_ERROR';
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is operational
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Extract error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}
