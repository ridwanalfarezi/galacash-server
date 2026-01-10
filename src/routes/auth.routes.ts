import { authController } from "@/controllers";
import { authenticate, validateBody } from "@/middlewares";
import { loginSchema, refreshTokenSchema } from "@/validators/schemas";
import { Router } from "express";

const router: Router = Router();

/**
 * POST /login
 * Login user with NIM and password
 */
router.post("/login", validateBody(loginSchema), authController.login);

/**
 * POST /refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", validateBody(refreshTokenSchema), authController.refresh);

/**
 * POST /logout
 * Logout user
 */
router.post("/logout", authenticate, authController.logout);

/**
 * GET /me
 * Get current authenticated user information
 */
router.get("/me", authenticate, authController.me);

export default router;
