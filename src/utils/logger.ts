import { Context } from 'hono';
import { env } from '@/config/env';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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

export const loggerConfig = LOG_CONFIG[env.NODE_ENV || 'development'] || LOG_CONFIG.development;

/**
 * Format request for logging
 */
export function formatRequest(c: Context, reqId: string): string {
  const method = c.req.method.padEnd(7);
  const path = c.req.path;
  const id = `[${reqId}]`;

  let log = `${method} ${path} ${id}`;

  if (loggerConfig.showHeaders) {
    const headers = Object.entries(c.req.header())
      .filter(([key]) => !['cookie', 'authorization'].includes(key.toLowerCase()))
      .map(([key, value]) => `${key}: ${value}`);

    if (headers.length > 0) {
      log += `\n'Headers:' ${headers.join(', ')}`;
    }
  }

  return log;
}

/**
 * Format response for logging
 */
export function formatResponse(_: Context, status: number, duration: number): string {
  const statusText = `${status}`;
  const durationText = `${duration.toFixed(2)}ms`;

  return `${statusText} ${durationText}`;
}

/**
 * Log a message with appropriate level and formatting
 */
function log(level: LogLevel, message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();

  const logEntry: Record<string, any> = {
    timestamp,
    level,
    message,
    service: env.SERVICE_NAME || 'unknown-service',
    environment: env.NODE_ENV || 'development',
  };

  if (args && args.length > 0) {
    // If extra args exist, attach them as metadata
    logEntry.metadata = args.length === 1 ? args[0] : args;
  }

  const logJson = JSON.stringify(logEntry);

  switch (level) {
    case 'error':
      console.error(logJson);
      break;
    case 'warn':
      console.warn(logJson);
      break;
    case 'info':
      console.info(logJson);
      break;
    case 'debug':
      console.debug(logJson);
      break;
  }
}

/**
 * Logger utility
 */
export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (['debug'].includes(loggerConfig.level)) {
      log('debug', message, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (['debug', 'info'].includes(loggerConfig.level)) {
      log('info', message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (['debug', 'info', 'warn'].includes(loggerConfig.level)) {
      log('warn', message, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    log('error', message, ...args);
  },
};
