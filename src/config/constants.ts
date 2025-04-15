/**
 * Application Constants
 * 
 * Central location for all application constants.
 */

/**
 * API Routes
 */
export const ROUTES = {
  API: {
    ROOT: '/api',
    V1: '/api/v1',
  },
  AUTH: {
    ROOT: '/auth',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    GOOGLE: {
      ROOT: '/auth/google',
      CALLBACK: '/auth/google/callback',
    },
  },
  USERS: {
    ROOT: '/users',
    PROFILE: '/users/profile',
  },
  HEALTH: {
    ROOT: '/health',
    DB: '/health/db',
  },
};

/**
 * Auth Constants
 */
export const AUTH = {
  TOKEN_TYPES: {
    ACCESS: 'access',
    REFRESH: 'refresh',
  },
  COOKIES: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
  },
  HEADERS: {
    AUTHORIZATION: 'Authorization',
  },
  SESSION: {
    USER_KEY: 'user',
  },
};

/**
 * Validation Constants
 */
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 100,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    MESSAGE: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
  },
  EMAIL: {
    PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    MESSAGE: 'Please enter a valid email address',
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/,
    MESSAGE: 'Username can only contain letters, numbers, and underscores',
  },
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_LOCKED: 'Account is locked. Please contact support',
    ACCOUNT_DISABLED: 'Account is disabled',
    EMAIL_ALREADY_EXISTS: 'Email already exists',
    USERNAME_ALREADY_EXISTS: 'Username already exists',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Forbidden access',
    TOKEN_EXPIRED: 'Token has expired',
    INVALID_TOKEN: 'Invalid token',
    OAUTH_FAILURE: 'OAuth authentication failed',
    MISSING_TOKEN: 'Authentication token is missing',
  },
  USER: {
    NOT_FOUND: 'User not found',
    INVALID_ID: 'Invalid user ID',
    UPDATE_FAILED: 'Failed to update user',
  },
  SERVER: {
    INTERNAL_ERROR: 'Internal server error',
    NOT_FOUND: 'Resource not found',
    BAD_REQUEST: 'Bad request',
  },
};

/**
 * Time Constants (in milliseconds)
 */
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
};

/**
 * Pagination Constants
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

