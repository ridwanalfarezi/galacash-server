import { authController } from '../controllers/index.js';
import { authenticate, authRateLimit, validateBody } from '../middlewares/index.js';
import { loginSchema, refreshTokenSchema } from '../validators/schemas.js';
import { Router } from 'express';

const router: Router = Router();

/**
 * POST /login
 * Login user with NIM and password
 */
router.post('/login', authRateLimit, validateBody(loginSchema), authController.login);

/**
 * POST /refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', authRateLimit, validateBody(refreshTokenSchema), authController.refresh);

/**
 * POST /logout
 * Logout user
 */
router.post('/logout', authenticate, authController.logout);

export default router;
