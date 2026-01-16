import { uploadAvatar } from "@/config/multer.config";
import { userController } from "@/controllers";
import { authenticate, strictRateLimit, uploadRateLimit, validateBody } from "@/middlewares";
import { handleFileUpload } from "@/middlewares/upload.middleware";
import { changePasswordSchema, updateProfileSchema } from "@/validators/schemas";
import { Router } from "express";

const router: Router = Router();

// All routes require authentication
router.use(authenticate);
// Allow both user and bendahara roles
// (bendahara can access profile for their own account)

/**
 * GET /profile
 * Get user profile
 */
router.get("/profile", userController.getProfile);

/**
 * PUT /profile
 * Update user profile
 */
router.put("/profile", validateBody(updateProfileSchema), userController.updateProfile);

/**
 * PUT /password
 * Change user password
 */
router.put(
  "/password",
  strictRateLimit,
  validateBody(changePasswordSchema),
  userController.changePassword
);

/**
 * POST /avatar
 * Upload user avatar
 */
router.post(
  "/avatar",
  uploadRateLimit,
  uploadAvatar.single("avatar"),
  handleFileUpload("avatars"),
  userController.uploadAvatar
);

/**
 * GET /classmates
 * Get classmates in user's class (for filter options)
 */
router.get("/classmates", userController.getClassmates);

export default router;
