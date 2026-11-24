import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logStash-logger'; // Import your new robust logger

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // 1. Track the start time
  const start = Date.now();

  // 2. Wait for the request to finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

    // 3. Log it! 
    // If it's an error (4xx or 5xx), log as 'warn' or 'error'
    // If it's success (2xx), log as 'info'
    if (res.statusCode >= 500) {
        // We handle 500s in errorLogger, but recording the transaction here is good too
        // We leave the stack trace for the error middleware
    } else if (res.statusCode >= 400) {
      logger.warn(message, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: duration, // <--- Sentry "Performance" data
        ip: req.ip
      });
    } else {
      logger.info(message, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: duration,
        ip: req.ip
      });
    }
  });

  next();
};