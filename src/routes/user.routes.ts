import { uploadAvatar } from "@/config/multer.config";
import { userController } from "@/controllers";
import { authenticate, requireUser, validateBody } from "@/middlewares";
import { handleFileUpload } from "@/middlewares/upload.middleware";
import { changePasswordSchema, updateProfileSchema } from "@/validators/schemas";
import { Router } from "express";

const router: Router = Router();

// All routes require authentication
router.use(authenticate);
// And must be a regular user
router.use(requireUser);

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
router.put("/password", validateBody(changePasswordSchema), userController.changePassword);

/**
 * POST /avatar
 * Upload user avatar
 */
router.post(
  "/avatar",
  uploadAvatar.single("avatar"),
  handleFileUpload("avatars"),
  userController.uploadAvatar
);

export default router;
