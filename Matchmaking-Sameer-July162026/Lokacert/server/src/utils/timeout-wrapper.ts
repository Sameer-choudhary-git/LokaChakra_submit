/**
 * Timeout Wrapper Utility
 * 
 * Provides timeout protection for async operations to prevent server freezing.
 * Includes comprehensive logging and error handling.
 */

import { ServiceUnavailableError, BlockchainNetworkError, ArweaveError } from './errors/CustomErrors';
import logger from './logStash-logger';

export interface TimeoutConfig {
  timeoutMs: number;
  operation: string;
  context?: any;
  errorType?: 'blockchain' | 'arweave' | 'general';
}

/**
 * Wraps a promise with timeout protection
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  config: TimeoutConfig
): Promise<T> {
  const { timeoutMs, operation, context = {}, errorType = 'general' } = config;
  
  const startTime = Date.now();
  
  logger.debug('Starting operation with timeout protection', {
    operation,
    timeoutMs,
    context
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      const duration = Date.now() - startTime;
      
      logger.error('Operation timed out', {
        operation,
        timeoutMs,
        actualDuration: duration,
        context
      });

      // Create appropriate error based on operation type
      let error: Error;
      switch (errorType) {
        case 'blockchain':
          error = new BlockchainNetworkError(
            `Blockchain operation '${operation}' timed out after ${timeoutMs}ms`
          );
          break;
        case 'arweave':
          error = new ArweaveError(
            `Arweave operation '${operation}' timed out after ${timeoutMs}ms`
          );
          break;
        default:
          error = new ServiceUnavailableError(
            `Operation '${operation}' timed out after ${timeoutMs}ms`
          );
      }
      
      reject(error);
    }, timeoutMs);

    // Clean up timeout if promise resolves/rejects first
    promise
      .then(() => clearTimeout(timeoutId))
      .catch(() => clearTimeout(timeoutId));
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    const duration = Date.now() - startTime;
    
    logger.debug('Operation completed successfully', {
      operation,
      duration,
      timeoutMs,
      context
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log the original error if it's not a timeout
    if (error instanceof Error && !error.message.includes('timed out')) {
      logger.error('Operation failed with error', {
        operation,
        duration,
        timeoutMs,
        error: error.message,
        stack: error.stack,
        context
      });
    }
    
    throw error;
  }
}

/**
 * Pre-configured timeout wrappers for common operations
 */
export const TimeoutOperations = {
  /**
   * Blockchain operations (10-30 seconds)
   */
  blockchain: {
    rpc: <T>(promise: Promise<T>, operation: string, context?: any): Promise<T> => 
      withTimeout(promise, {
        timeoutMs: 15000, // 15 seconds
        operation: `blockchain.rpc.${operation}`,
        context,
        errorType: 'blockchain'
      }),
    
    transaction: <T>(promise: Promise<T>, operation: string, context?: any): Promise<T> => 
      withTimeout(promise, {
        timeoutMs: 30000, // 30 seconds
        operation: `blockchain.tx.${operation}`,
        context,
        errorType: 'blockchain'
      }),
    
    validation: <T>(promise: Promise<T>, operation: string, context?: any): Promise<T> => 
      withTimeout(promise, {
        timeoutMs: 10000, // 10 seconds
        operation: `blockchain.validation.${operation}`,
        context,
        errorType: 'blockchain'
      })
  },

  /**
   * Arweave operations (60 seconds for uploads)
   */
  arweave: {
    upload: <T>(promise: Promise<T>, operation: string, context?: any): Promise<T> => 
      withTimeout(promise, {
        timeoutMs: 60000, // 60 seconds
        operation: `arweave.upload.${operation}`,
        context,
        errorType: 'arweave'
      }),
    
    fetch: <T>(promise: Promise<T>, operation: string, context?: any): Promise<T> => 
      withTimeout(promise, {
        timeoutMs: 15000, // 15 seconds
        operation: `arweave.fetch.${operation}`,
        context,
        errorType: 'arweave'
      })
  }
};
