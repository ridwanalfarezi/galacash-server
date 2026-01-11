import { uploadAttachment } from "@/config/multer.config";
import { fundApplicationController } from "@/controllers";
import {
  authenticate,
  requireUser,
  uploadRateLimit,
  validateBody,
  validateQuery,
} from "@/middlewares";
import { handleOptionalFileUpload } from "@/middlewares/upload.middleware";
import { createFundApplicationSchema, fundApplicationFilterSchema } from "@/validators/schemas";
import { Router } from "express";

const router: Router = Router();

// All routes require authentication and user role
router.use(authenticate);
router.use(requireUser);

/**
 * GET /
 * Get all fund applications with filtering and pagination
 */
router.get("/", validateQuery(fundApplicationFilterSchema), fundApplicationController.getAll);

/**
 * GET /my
 * Get user's own fund applications
 */
router.get("/my", validateQuery(fundApplicationFilterSchema), fundApplicationController.getMy);

/**
 * GET /:id
 * Get fund application by ID
 */
router.get("/:id", fundApplicationController.getById);

/**
 * POST /
 * Create new fund application with optional attachment
 */
router.post(
  "/",
  uploadRateLimit,
  uploadAttachment.single("attachment"),
  handleOptionalFileUpload("attachments"),
  validateBody(createFundApplicationSchema),
  fundApplicationController.create
);

export default router;
