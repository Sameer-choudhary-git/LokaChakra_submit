/**
 * Enhanced Request Logging Middleware
 * * Production-ready request logging with:
 * - Structured logging with Logstash integration
 * - Performance monitoring and metrics
 * - Request correlation tracking
 * - Security event logging (Memory Leak Fixed)
 * - Rate limiting monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logStash-logger';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface RequestMetrics {
  totalRequests: number;
  requestsByMethod: { [key: string]: number };
  requestsByPath: { [key: string]: number };
  responseTimeStats: {
    min: number;
    max: number;
    avg: number;
    total: number;
  };
  statusCodeCounts: { [key: string]: number };
  lastReset: Date;
}

// ============================================================================
// METRICS COLLECTION (FIXED: Memory Safe)
// ============================================================================

class RequestMetricsCollector {
  private metrics: RequestMetrics = {
    totalRequests: 0,
    requestsByMethod: {},
    requestsByPath: {},
    responseTimeStats: { min: Infinity, max: 0, avg: 0, total: 0 },
    statusCodeCounts: {},
    lastReset: new Date()
  };

  private requestCountForAvg = 0;

  recordRequest(method: string, path: string, statusCode: number, responseTime: number): void {
    this.metrics.totalRequests++;
    
    // 1. Safe Method Tracking
    this.metrics.requestsByMethod[method] = (this.metrics.requestsByMethod[method] || 0) + 1;

    // 2. Memory Safe Path Tracking
    // We group unknown paths to prevent memory explosion from bot scanners
    const safePath = path.startsWith('/api') || path === '/' ? path : '_other_';
    this.metrics.requestsByPath[safePath] = (this.metrics.requestsByPath[safePath] || 0) + 1;

    this.metrics.statusCodeCounts[statusCode] = (this.metrics.statusCodeCounts[statusCode] || 0) + 1;

    // 3. Incremental Average Calculation (O(1) Memory usage)
    this.updateResponseTimeStats(responseTime);
  }

  private updateResponseTimeStats(responseTime: number): void {
    const stats = this.metrics.responseTimeStats;
    
    if (responseTime < stats.min) stats.min = responseTime;
    if (responseTime > stats.max) stats.max = responseTime;
    
    stats.total += responseTime;
    this.requestCountForAvg++;
    stats.avg = stats.total / this.requestCountForAvg;
  }

  getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      totalRequests: 0,
      requestsByMethod: {},
      requestsByPath: {},
      responseTimeStats: { min: Infinity, max: 0, avg: 0, total: 0 },
      statusCodeCounts: {},
      lastReset: new Date()
    };
    this.requestCountForAvg = 0;
  }
}

const metricsCollector = new RequestMetricsCollector();

// ============================================================================
// SECURITY MONITORING (FIXED: Auto-Cleanup)
// ============================================================================

class SecurityMonitor {
  private ipRequestCounts: Map<string, number> = new Map();
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 Minutes
  private lastCleanup = Date.now();

  private suspiciousPatterns: RegExp[] = [
    /\.\.\//,          // Path traversal
    /<script/i,        // XSS
    /union\s+select/i, // SQLi
    /drop\s+table/i,   // SQLi
    /javascript:/i,    // JS Injection
  ];

  constructor() {
    // Auto-cleanup interval to prevent Memory Leaks
    setInterval(() => this.resetIpCounts(), this.WINDOW_MS);
  }

  checkSuspiciousActivity(req: Request): any | null {
    // Backup check in case interval drifts
    if (Date.now() - this.lastCleanup > this.WINDOW_MS) {
      this.resetIpCounts();
    }

    const ip = req.ip || 'unknown';
    const path = req.originalUrl || '';
    const userAgent = req.get('User-Agent') || '';

    // 1. Rate Limiting Monitor
    const currentCount = (this.ipRequestCounts.get(ip) || 0) + 1;
    this.ipRequestCounts.set(ip, currentCount);

    if (currentCount > 500) { 
      return { 
        type: 'RATE_LIMIT_APPROACHED', 
        severity: 'MEDIUM', 
        details: { ip, requestCount: currentCount } 
      };
    }

    // 2. Suspicious Pattern Matching
    const matchedPattern = this.suspiciousPatterns.find(p => p.test(path));
    if (matchedPattern) {
      return {
        type: 'SUSPICIOUS_REQUEST',
        severity: 'HIGH',
        details: { ip, path, pattern: matchedPattern.source }
      };
    }

    // 3. Bad User Agent
    if (!userAgent || userAgent.length < 5 || userAgent.toLowerCase().includes('sqlmap')) {
      return { 
        type: 'SUSPICIOUS_USER_AGENT', 
        severity: 'MEDIUM', 
        details: { ip, userAgent } 
      };
    }

    return null;
  }

  resetIpCounts(): void {
    this.ipRequestCounts.clear();
    this.lastCleanup = Date.now();
  }
}

const securityMonitor = new SecurityMonitor();

// ============================================================================
// UTILS
// ============================================================================

function sanitizeBody(body: any): any {
  if (!body) return body;
  
  // Deep copy to prevent mutation
  const sanitized = JSON.parse(JSON.stringify(body));
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'mnemonic', 'authorization', 'cookie'];

  const clean = (obj: any) => {
    Object.keys(obj).forEach(key => {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        clean(obj[key]);
      }
    });
  };

  if (typeof sanitized === 'object') clean(sanitized);
  return sanitized;
}

// ============================================================================
// MAIN MIDDLEWARE
// ============================================================================

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startHrTime = process.hrtime();
  
  // 1. Correlation ID
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // 2. Security Check
  const securityEvent = securityMonitor.checkSuspiciousActivity(req);
  if (securityEvent) {
    logger.warn('Security Alert', { requestId, ...securityEvent });
  }

  // 3. Log Incoming Request
  logger.info('Incoming Request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    // Only log body for non-GET requests to reduce noise
    body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined
  });

  // 4. Hook res.json to capture response body (for error logging)
  const originalJson = res.json;
  let responseBody: any = null;

  res.json = function (data) {
    responseBody = data;
    return originalJson.call(this, data);
  };

  // 5. Finalize Logging on Response Finish
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startHrTime);
    const durationMs = (seconds * 1000 + nanoseconds / 1e6);
    
    // Use the defined route path if available (e.g., /api/user/:id), otherwise original URL
    const routePath = req.route ? req.route.path : req.originalUrl;
    
    // Update Metrics
    metricsCollector.recordRequest(req.method, routePath, res.statusCode, durationMs);

    const logData = {
      requestId,
      statusCode: res.statusCode,
      duration: `${durationMs.toFixed(2)}ms`,
      method: req.method,
      url: req.originalUrl
    };

    // Log Logic: Warn on errors/slow requests, Info on success
    if (res.statusCode >= 400) {
      logger.warn('Request Failed', {
        ...logData,
        error: responseBody ? sanitizeBody(responseBody) : 'No body captured'
      });
    } else if (durationMs > 3000) {
      logger.warn('Slow Request Detected', logData);
    } else {
      logger.info('Request Success', logData);
    }
  });

  next();
};

// ============================================================================
// METRICS ENDPOINTS
// ============================================================================

export const getRequestMetrics = (req: Request, res: Response): void => {
  res.json({
    success: true,
    metrics: metricsCollector.getMetrics(),
    timestamp: new Date().toISOString()
  });
};

export const resetRequestMetrics = (req: Request, res: Response): void => {
  metricsCollector.reset();
  securityMonitor.resetIpCounts();
  
  res.json({
    success: true,
    message: 'Request metrics reset successfully',
    timestamp: new Date().toISOString()
  });
};

export const healthCheck = (req: Request, res: Response): void => {
  const metrics = metricsCollector.getMetrics();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics: {
      totalRequests: metrics.totalRequests,
      avgResponseTime: `${metrics.responseTimeStats.avg.toFixed(2)}ms`,
    }
  };

  if (metrics.responseTimeStats.avg > 2000) {
    (health as any).status = 'degraded';
  }

  res.json(health);
};