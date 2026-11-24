import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

// Define log directory from env or default
const logDir = process.env.LOG_DIR || 'logs';

// 🛑 SENSITIVE KEYS TO REDACT
const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'secret', 'key'];

// Custom Format to scrub sensitive data
const sanitizeFormat = winston.format((info) => {
  const maskSensitive = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    // Copy to avoid mutating original object
    const copy = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key in copy) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
        copy[key] = '***REDACTED***';
      } else if (typeof copy[key] === 'object') {
        copy[key] = maskSensitive(copy[key]);
      }
    }
    return copy;
  };

  return maskSensitive(info);
});

// Define options for DailyRotateFile
const dailyRotateFileOptions = {
  dirname: logDir,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
};

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    sanitizeFormat(), // Apply scrubbing first
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // Print stack trace
    winston.format.splat(),
    winston.format.json() // Production logs must be JSON
  ),
  transports: [
    // 1. SEPARATE ERROR LOG (Critical for debugging)
    new winston.transports.DailyRotateFile({
      ...dailyRotateFileOptions,
      filename: 'error-%DATE%.log',
      level: 'error', // Only logs level 0 (error)
    }),

    // 2. COMBINED LOG (Everything else)
    new winston.transports.DailyRotateFile({
      ...dailyRotateFileOptions,
      filename: 'app-%DATE%.log',
    }),

    // 3. CONSOLE (Development only)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack }) => {
          // Custom pretty print for console
          return `${timestamp} [${level}]: ${message} ${stack || ''}`;
        })
      ),
      // Only show console logs in dev, OR if we explicitly ask for it
      silent: process.env.NODE_ENV === 'production' && process.env.LOG_TO_CONSOLE !== 'true'
    }),
  ],
  exitOnError: false,
});

// Stream for Morgan (HTTP Logger)
export const stream = {
  write: (message: string) => {
    // Trim the message to remove empty lines
    logger.http(message.trim());
  },
};

export default logger;