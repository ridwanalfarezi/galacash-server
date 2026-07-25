import { uploadAttachment } from '../config/multer.config.js';
import { fundApplicationController } from '../controllers/index.js';
import {
  authenticate,
  requireUser,
  uploadRateLimit,
  validateBody,
  validateQuery,
} from '../middlewares/index.js';
import { handleOptionalFileUpload } from '../middlewares/upload.middleware.js';
import { createFundApplicationSchema, fundApplicationFilterSchema } from '../validators/schemas.js';
import { Router } from 'express';

const router: Router = Router();

// All routes require authentication and user role
router.use(authenticate);
router.use(requireUser);

/**
 * GET /
 * Get all fund applications with filtering and pagination
 */
router.get('/', validateQuery(fundApplicationFilterSchema), fundApplicationController.getAll);

/**
 * GET /my
 * Get user's own fund applications
 */
router.get('/my', validateQuery(fundApplicationFilterSchema), fundApplicationController.getMy);

/**
 * GET /:id
 * Get fund application by ID
 */
router.get('/:id', fundApplicationController.getById);

/**
 * POST /
 * Create new fund application with optional attachment
 */
router.post(
  '/',
  uploadRateLimit,
  uploadAttachment.single('attachment'),
  handleOptionalFileUpload('attachments'),
  validateBody(createFundApplicationSchema),
  fundApplicationController.create
);

export default router;
