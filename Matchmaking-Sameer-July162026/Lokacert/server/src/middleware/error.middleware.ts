import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logStash-logger';

// Standard Express Error Handler
export const errorMiddleware = (
  error: Error, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  // 1. Log the crash details to Logstash
  logger.error(error.message, { 
    stack: error.stack,
    method: req.method,
    url: req.url,
  });

  // 2. Send a response to the user
  const status = 500;
  const message = error.message || 'Something went wrong';

  res.status(status).json({
    status,
    message,
  });
};