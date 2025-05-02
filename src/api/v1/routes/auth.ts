import { Hono } from 'hono';
import { authController } from '@/controllers';
import { authMiddleware } from '@/middlewares/auth';

const authRouter = new Hono();

/**
 * @route POST /auth/login
 * @description Authenticate user with email and password
 * @access Public
 */
authRouter.post('/login', authController.login);

/**
 * @route POST /auth/register
 * @description Register a new user account
 * @access Public
 */
authRouter.post('/register', authController.register);

/**
 * @route POST /auth/refresh
 * @description Refresh access token using refresh token
 * @access Public
 */
authRouter.post('/refresh', authController.refreshToken);

/**
 * @route POST /auth/logout
 * @description Logout user and invalidate tokens
 * @access Private
 */
authRouter.post('/logout', authMiddleware.ensureAuthenticated, authController.logout);

/**
 * @route GET /auth/me
 * @description Get current authenticated user
 * @access Private
 */
authRouter.get('/me', authMiddleware.ensureAuthenticated, authController.getCurrentUser);

/**
 * @route GET /auth/google
 * @description Initiate Google OAuth flow
 * @access Public
 */
authRouter.get('/google', authController.googleAuth);

/**
 * @route GET /auth/google/callback
 * @description Handle Google OAuth callback
 * @access Public
 */
authRouter.get('/google/callback', authController.googleCallback);

export { authRouter };
