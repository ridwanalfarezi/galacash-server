import { uploadPaymentProof } from "@/config/multer.config";
import { cashBillController } from "@/controllers";
import {
  authenticate,
  requireUser,
  uploadRateLimit,
  validateBody,
  validateQuery,
} from "@/middlewares";
import { handleFileUpload } from "@/middlewares/upload.middleware";
import { cashBillFilterSchema } from "@/validators/schemas";
import { Router } from "express";
import Joi from "joi";

const router: Router = Router();

// All routes require authentication and user role
router.use(authenticate);
router.use(requireUser);

/**
 * GET /my
 * Get user's cash bills with filtering and pagination
 */
router.get("/my", validateQuery(cashBillFilterSchema), cashBillController.getMyBills);

/**
 * GET /
 * Get all cash bills with filtering and pagination
 */
router.get("/", validateQuery(cashBillFilterSchema), cashBillController.getMyBills);

/**
 * GET /:id
 * Get cash bill by ID
 */
router.get("/:id", cashBillController.getById);

/**
 * POST /:id/pay
 * Pay a cash bill with payment proof
 */
router.post(
  "/:id/pay",
  uploadRateLimit,
  uploadPaymentProof.single("paymentProof"),
  handleFileUpload("payments"),
  validateBody(
    Joi.object({
      paymentMethod: Joi.string().valid("bank", "ewallet", "cash").required().messages({
        "any.required": "Payment method is required",
        "any.only": "Payment method must be 'bank', 'ewallet', or 'cash'",
      }),
      paymentAccountId: Joi.string().uuid().optional().messages({
        "string.guid": "Payment account ID must be a valid UUID",
      }),
    })
  ),
  cashBillController.pay
);

/**
 * POST /:id/cancel-payment
 * Cancel a pending payment
 */
router.post("/:id/cancel-payment", cashBillController.cancelPayment);

export default router;
