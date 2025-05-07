export const auth = {
  tokenTypes: {
    ACCESS: 'access',
    REFRESH: 'refresh',
  },
  cookies: {
    ACCESS_TOKEN: 'access-token',
    REFRESH_TOKEN: 'refresh-token',
  },
  headers: {
    AUTHORIZATION: 'Authorization',
  },
  session: {
    USER_KEY: 'user',
  },
};

export const validation = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 100,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  },
};

export const messages = {
  auth: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_TAKEN: 'Email is already taken',
    ACCOUNT_LOCKED: 'Account is locked. Please contact support',
    ACCOUNT_DISABLED: 'Account is disabled',
    USERNAME_ALREADY_EXISTS: 'Username already exists',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Forbidden access',
    TOKEN_EXPIRED: 'Token has expired',
    INVALID_TOKEN: 'Invalid token',
    OAUTH_FAILURE: 'OAuth authentication failed',
    MISSING_TOKEN: 'Authentication token is missing',
    OAUTH_ACCOUNT_EXISTS:
      'This email is linked to a social login. Please sign in with your OAuth provider.',
  },
  user: {
    NOT_FOUND: 'User not found',
    INVALID_ID: 'Invalid user ID',
    UPDATE_FAILED: 'Failed to update user',
  },
  server: {
    INTERNAL_ERROR: 'Internal server error',
    NOT_FOUND: 'Resource not found',
    BAD_REQUEST: 'Bad request',
    NOT_IMPLEMENTED: 'Not implemented',
  },
};

export const time = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
};

export const pagination = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};
