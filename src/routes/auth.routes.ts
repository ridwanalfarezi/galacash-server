import { authController } from "@/controllers";
import { authenticate, authRateLimit, validateBody } from "@/middlewares";
import { loginSchema, refreshTokenSchema } from "@/validators/schemas";
import { Router } from "express";

const router: Router = Router();

/**
 * POST /login
 * Login user with NIM and password
 */
router.post("/login", authRateLimit, validateBody(loginSchema), authController.login);

/**
 * POST /refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", authRateLimit, validateBody(refreshTokenSchema), authController.refresh);

/**
 * POST /logout
 * Logout user
 */
router.post("/logout", authenticate, authController.logout);

export default router;
