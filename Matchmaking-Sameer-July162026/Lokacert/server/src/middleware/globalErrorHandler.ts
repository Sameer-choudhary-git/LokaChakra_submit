/**
 * Enhanced Global Error Handler Middleware
 * 
 * Production-ready error handling with:
 * - Structured logging with Logstash integration
 * - Error categorization and response formatting
 * - Security-conscious error exposure
 * - Performance monitoring
 * - Error aggregation and alerting
 * - Request correlation for debugging
 */

import { Request, Response, NextFunction } from 'express';
import { 
  AppError, 
  isAppError, 
  isOperationalError, 
  getErrorMessage,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  BlockchainError,
  SolanaTransactionError,
  AnchorProgramError,
  ArweaveError,
  DatabaseError,
  ExternalServiceError
} from '../utils/errors/CustomErrors';
import logger from '../utils/logStash-logger';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
    timestamp: string;
  };
}

interface ErrorMetrics {
  errorCount: number;
  lastError: Date | null;
  errorsByType: { [key: string]: number };
}

// ============================================================================
// ERROR METRICS TRACKING
// ============================================================================

class ErrorMetricsCollector {
  private metrics: ErrorMetrics = {
    errorCount: 0,
    lastError: null,
    errorsByType: {}
  };

  recordError(error: Error): void {
    this.metrics.errorCount++;
    this.metrics.lastError = new Date();
    
    const errorType = error.constructor.name;
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
    
    // Log high-frequency errors as warnings
    if (this.metrics.errorsByType[errorType] > 10) {
      logger.warn('High frequency error detected', {
        errorType,
        count: this.metrics.errorsByType[errorType],
        timeWindow: '1hour' // Implement time window reset as needed
      });
    }
  }

  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      errorCount: 0,
      lastError: null,
      errorsByType: {}
    };
  }
}

const errorMetrics = new ErrorMetricsCollector();

// ============================================================================
// ERROR RESPONSE BUILDERS
// ============================================================================

/**
 * Build standardized error response
 */
function buildErrorResponse(
  error: Error,
  requestId: string,
  includeDetails: boolean = false
): ErrorResponse {
  const baseResponse: ErrorResponse = {
    success: false,
    error: {
      code: isAppError(error) ? error.errorCode : 'UNKNOWN_ERROR',
      message: error.message,
      requestId,
      timestamp: new Date().toISOString()
    }
  };

  if (includeDetails && isAppError(error)) {
    // Add additional details for development environment
    baseResponse.error.details = {
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      stack: error.stack
    };
  }

  return baseResponse;
}

/**
 * Build production-safe error response
 */
function buildProductionErrorResponse(
  error: Error,
  requestId: string
): ErrorResponse {
  if (isOperationalError(error) && isAppError(error)) {
    return buildErrorResponse(error, requestId, false);
  }

  // For non-operational errors, return generic message
  return {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      requestId,
      timestamp: new Date().toISOString()
    }
  };
}

// ============================================================================
// ERROR CATEGORIZATION & LOGGING
// ============================================================================

/**
 * Categorize error for appropriate logging level
 */
function getLogLevel(error: Error): 'debug' | 'info' | 'warn' | 'error' {
  if (!isAppError(error)) {
    return 'error'; // Unknown errors are critical
  }

  // Client errors (4xx) - usually warn level
  if (error.statusCode >= 400 && error.statusCode < 500) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return 'info'; // Common client errors
    }
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return 'warn'; // Security-related
    }
    return 'warn';
  }

  // Server errors (5xx) - always error level
  if (error.statusCode >= 500) {
    return 'error';
  }

  return 'warn';
}

/**
 * Extract relevant error context for logging
 */
function extractErrorContext(error: Error, req: Request): any {
  const context: any = {
    errorType: error.constructor.name,
    path: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  };

  // Add specific context based on error type
  if (error instanceof ValidationError && error.field) {
    context.invalidField = error.field;
    context.invalidValue = error.value;
  }

  if (error instanceof BlockchainError) {
    context.txSignature = error.txSignature;
    context.programErrorCode = error.programErrorCode;
  }

  if (error instanceof SolanaTransactionError) {
    context.logs = error.logs;
    context.instructionIndex = error.instructionIndex;
  }

  if (error instanceof AnchorProgramError) {
    context.programId = error.programId;
  }

  if (error instanceof RateLimitError) {
    context.retryAfter = error.retryAfter;
  }

  // Sanitize request body (remove sensitive data)
  const sanitizedBody = { ...req.body };
  delete sanitizedBody.password;
  delete sanitizedBody.privateKey;
  delete sanitizedBody.mnemonic;
  context.requestBody = sanitizedBody;

  return context;
}

// ============================================================================
// SECURITY HEADERS & SANITIZATION
// ============================================================================

/**
 * Add security headers for error responses
 */
function addSecurityHeaders(res: Response): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
}

/**
 * Sanitize error message to prevent information leakage
 */
function sanitizeErrorMessage(error: Error, isProduction: boolean): string {
  if (!isProduction) {
    return error.message;
  }

  // In production, sanitize potentially sensitive error messages
  const message = error.message.toLowerCase();
  
  if (message.includes('database') || message.includes('sql')) {
    return 'Database operation failed';
  }
  
  if (message.includes('password') || message.includes('auth')) {
    return 'Authentication failed';
  }
  
  if (message.includes('file') || message.includes('path')) {
    return 'File operation failed';
  }

  return error.message;
}

// ============================================================================
// MAIN ERROR HANDLER
// ============================================================================

export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    return next(error);
  }
  // Generate correlation ID for tracking
  const requestId = (req as any).requestId || req.headers['x-request-id'] as string || uuidv4();  
  // Record error metrics
  errorMetrics.recordError(error);
  
  // Extract error context
  const errorContext = extractErrorContext(error, req);
  
  // Determine if we're in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Get appropriate log level
  const logLevel = getLogLevel(error);
  
  // Log the error with appropriate level
  const logData = {
    requestId,
    ...errorContext,
    message: error.message,
    stack: error.stack
  };

  switch (logLevel) {
    case 'debug':
      logger.debug('Debug error occurred', logData);
      break;
    case 'info':
      logger.info('Client error occurred', logData);
      break;
    case 'warn':
      logger.warn('Warning: Operational error occurred', logData);
      break;
    case 'error':
      logger.error('Critical error occurred', logData);
      break;
  }

  // Add security headers
  addSecurityHeaders(res);
  
  // Set status code
  const statusCode = isAppError(error) ? error.statusCode : 500;
  
  // Build appropriate response
  const errorResponse = isProduction
    ? buildProductionErrorResponse(error, requestId)
    : buildErrorResponse(error, requestId, true);

  // Sanitize error message if needed
  errorResponse.error.message = sanitizeErrorMessage(error, isProduction);

  // Send response
  res.status(statusCode).json(errorResponse);
};

// ============================================================================
// ASYNC ERROR HANDLER WRAPPER
// ============================================================================

/**
 * Wrapper for async route handlers to catch errors
 */
export const asyncErrorHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============================================================================
// NOT FOUND HANDLER
// ============================================================================

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  logger.info('Route not found', {
    requestId,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  const error = new NotFoundError('Route', req.originalUrl);
  next(error);
};


// ============================================================================
// ERROR METRICS ENDPOINT
// ============================================================================

export const getErrorMetrics = (req: Request, res: Response): void => {
  res.json({
    success: true,
    metrics: errorMetrics.getMetrics(),
    timestamp: new Date().toISOString()
  });
};

export const resetErrorMetrics = (req: Request, res: Response): void => {
  errorMetrics.reset();
  res.json({
    success: true,
    message: 'Error metrics reset successfully',
    timestamp: new Date().toISOString()
  });
};
