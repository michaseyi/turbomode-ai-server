/**
 * Environment variables validation and configuration
 * 
 * This file handles loading and validating environment variables
 * with proper typing and default values.
 */

// Environment types
export type NodeEnv = 'development' | 'production' | 'test';

/**
 * Validates environment variables and provides typed access
 */
export function validateEnv() {
  // Required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    // Server
    NODE_ENV: (process.env.NODE_ENV as NodeEnv) || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    API_PREFIX: process.env.API_PREFIX || '/api',
    
    // Auth
    JWT_SECRET: process.env.JWT_SECRET || '',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    
    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback',
    
    // Database
    DATABASE_URL: process.env.DATABASE_URL || '',
    
    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    
    // Server timeout
    REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || '60000', 10),
  };
}

/**
 * Environment variables with type safety
 */
export const env = validateEnv();

