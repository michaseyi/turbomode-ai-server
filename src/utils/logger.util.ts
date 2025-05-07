import { Context } from 'hono';
import { config } from '@/config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_CONFIG = {
  development: {
    level: 'debug',
    colorize: true,
    showHeaders: !true,
    showBody: !true,
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

export const logConfig = LOG_CONFIG[config.app.environment];

/**
 * Format request for logging
 */
export function formatRequest(c: Context, reqId: string): string {
  const method = c.req.method.padEnd(7);
  const path = c.req.path;
  const id = `[${reqId}]`;

  let log = `${method} ${path} ${id}`;

  if (logConfig.showHeaders) {
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
export function log(level: LogLevel, message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();

  const logEntry: Record<string, any> = {
    timestamp,
    level,
    message,
    service: config.app.name || '',
    environment: config.app.environment,
  };

  if (args && args.length > 0) {
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

export function debug(message: string, ...args: any[]) {
  if (['debug'].includes(logConfig.level)) {
    log('debug', message, ...args);
  }
}

export function info(message: string, ...args: any[]) {
  if (['debug', 'info'].includes(logConfig.level)) {
    log('info', message, ...args);
  }
}

export function warn(message: string, ...args: any[]) {
  if (['debug', 'info', 'warn'].includes(logConfig.level)) {
    log('warn', message, ...args);
  }
}

export function error(message: string, ...args: any[]) {
  log('error', message, ...args);
}
