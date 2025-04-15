/**
 * Middleware Exports
 * 
 * Central export point for all application middlewares.
 * Makes importing middlewares more consistent throughout the application.
 */

// Auth middlewares
import { authMiddleware, roleMiddleware, getAccessToken } from './auth.js';

// Error handling middleware
import { errorMiddleware, notFoundMiddleware } from './error.js';

// Validation middleware
import { validateRequest } from './validation.js';

// Logging middleware
import { requestLogger } from './logger.js';

// Export all middlewares
export {
  // Auth middlewares
  authMiddleware,
  roleMiddleware,
  getAccessToken,
  
  // Error handling middlewares
  errorMiddleware,
  notFoundMiddleware,
  
  // Validation middleware
  validateRequest,
  
  // Logging middleware
  requestLogger,
};

// Additional exports may be added as the application grows

