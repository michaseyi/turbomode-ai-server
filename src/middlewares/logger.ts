/**
 * Logger Middleware
 * 
 * Provides request/response logging, performance timing, and request tracking.
 * Configurable for different environments with appropriate log levels.
 */

import { Context, Next, MiddlewareHandler } from 'hono';
import { env } from '@/config/env.js';
import { nanoid } from 'nanoid';

// Log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Environment-based log configuration
const LOG_CONFIG = {
  development: {
    level: 'debug',
    colorize: true,
    showHeaders: true,
    showBody: true,
  },
  production: {
    level: 'info',
    colorize: false,
    showHeaders: false,
    showBody: false,
  },
  test: {
    level: 'error',
    colorize: false,
    showHeaders: false,
    showBody: false,
  },
};

// Get current configuration based on environment
const config = LOG_CONFIG[env.NODE_ENV || 'development'] || LOG_CONFIG.development;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Colorize text if colorization is enabled
 */
function colorize(text: string, color: keyof typeof colors): string {
  if (config.colorize) {
    return `${colors[color]}${text}${colors.reset}`;
  }
  return text;
}

/**
 * Status code to color mapping
 */
function statusColor(status: number): keyof typeof colors {
  if (status >= 500) return 'red';
  if (status >= 400) return 'yellow';
  if (status >= 300) return 'cyan';
  if (status >= 200) return 'green';
  return 'gray';
}

/**
 * Method to color mapping
 */
function methodColor(method: string): keyof typeof colors {
  switch (method.toUpperCase()) {
    case 'GET': return 'blue';
    case 'POST': return 'green';
    case 'PUT': return 'yellow';
    case 'DELETE': return 'red';
    case 'PATCH': return 'magenta';
    default: return 'gray';
  }
}

/**
 * Format request for logging
 */
function formatRequest(c: Context, reqId: string): string {
  const method = colorize(c.req.method.padEnd(7), methodColor(c.req.method));
  const path = c.req.path;
  const id = colorize(`[${reqId}]`, 'dim');
  
  let log = `${method} ${path} ${id}`;
  
  if (config.showHeaders) {
    const headers = Object.entries(c.req.header())
      .filter(([key]) => !['cookie', 'authorization'].includes(key.toLowerCase()))
      .map(([key, value]) => `${key}: ${value}`);
    
    if (headers.length > 0) {
      log += `\n${colorize('Headers:', 'dim')} ${headers.join(', ')}`;
    }
  }
  
  return log;
}

/**
 * Format response for logging
 */
function formatResponse(c: Context, status: number, duration: number): string {
  const statusText = colorize(`${status}`, statusColor(status));
  const durationText = colorize(`${duration.toFixed(2)}ms`, 'cyan');
  
  return `${statusText} ${durationText}`;
}

/**
 * Log a message with appropriate level and formatting
 */
function log(level: LogLevel, message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase().padEnd(5);
  const levelColored = colorize(levelUpper, level === 'error' ? 'red' : level === 'warn' ? 'yellow' : level === 'info' ? 'green' : 'blue');
  
  const logPrefix = `${colorize(timestamp, 'gray')} ${levelColored}`;
  
  switch (level) {
    case 'error':
      console.error(`${logPrefix} ${message}`, ...args);
      break;
    case 'warn':
      console.warn(`${logPrefix} ${message}`, ...args);
      break;
    case 'info':
      console.info(`${logPrefix} ${message}`, ...args);
      break;
    case 'debug':
      console.debug(`${logPrefix} ${message}`, ...args);
      break;
  }
}

/**
 * Request logger middleware
 * 
 * Logs incoming requests and outgoing responses with timing information.
 * Adds a unique request ID to each request for tracking.
 * 
 * Usage:
 * ```
 * app.use('*', requestLogger);
 * ```
 */
export const requestLogger: MiddlewareHandler = async (c: Context, next: Next) => {
  // Generate a unique request ID
  const requestId = nanoid(10);
  c.set('requestId', requestId);
  
  // Start timing
  const startTime = performance.now();
  
  // Log request
  log('info', `${formatRequest(c, requestId)}`);
  
  try {
    // Process request
    await next();
    
    // Calculate duration
    const duration = performance.now() - startTime;
    
    // Get response status (default to 200 if not set)
    const status = c.res ? c.res.status : 200;
    
    // Log response
    log('info', `${formatResponse(c, status, duration)}`);
    
    // Debug level additional info
    if (config.level === 'debug') {
      // Log body for specific content types
      const contentType = c.res?.headers.get('content-type');
      if (
        config.showBody && 
        contentType && 
        contentType.includes('application/json') && 
        c.res.body
      ) {
        try {
          const responseText = await c.res.clone().text();
          if (responseText) {
            log('debug', `Response body: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
          }
        } catch (e) {
          // Ignore body parsing errors
        }
      }
    }
  } catch (error) {
    // Calculate duration for error case
    const duration = performance.now() - startTime;
    
    // Log error
    log('error', `Request failed after ${duration.toFixed(2)}ms: ${error instanceof Error ? error.message : String(error)}`);
    
    // Re-throw to let error middleware handle it
    throw error;
  }
};

/**
 * Logger utility for use throughout the application
 */
export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (['debug'].includes(config.level)) {
      log('debug', message, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (['debug', 'info'].includes(config.level)) {
      log('info', message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (['debug', 'info', 'warn'].includes(config.level)) {
      log('warn', message, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    log('error', message, ...args);
  },
};

