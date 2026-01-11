import { paymentAccountController } from "@/controllers/payment-account.controller";
import { authenticate, requireBendahara, validateBody } from "@/middlewares";
import { Router } from "express";
import Joi from "joi";

const router: Router = Router();

/**
 * Public route - Get active payment accounts
 * Users need to see available payment options when paying bills
 */
router.get("/active", paymentAccountController.getActive);

// All routes below require authentication and bendahara role
router.use(authenticate);
router.use(requireBendahara);

/**
 * GET /
 * Get all payment accounts with optional filtering (bendahara only)
 */
router.get("/", paymentAccountController.getAll);

/**
 * GET /:id
 * Get payment account by ID (bendahara only)
 */
router.get("/:id", paymentAccountController.getById);

/**
 * POST /
 * Create new payment account (bendahara only)
 */
router.post(
  "/",
  validateBody(
    Joi.object({
      name: Joi.string().required().messages({
        "any.required": "Account name is required",
      }),
      accountType: Joi.string().valid("bank", "ewallet").required().messages({
        "any.required": "Account type is required",
        "any.only": "Account type must be 'bank' or 'ewallet'",
      }),
      accountNumber: Joi.string().optional(),
      accountHolder: Joi.string().optional(),
      description: Joi.string().optional(),
    })
  ),
  paymentAccountController.create
);

/**
 * PUT /:id
 * Update payment account (bendahara only)
 */
router.put(
  "/:id",
  validateBody(
    Joi.object({
      name: Joi.string().optional(),
      accountNumber: Joi.string().optional(),
      accountHolder: Joi.string().optional(),
      description: Joi.string().optional(),
      status: Joi.string().valid("active", "inactive").optional(),
    })
  ),
  paymentAccountController.update
);

/**
 * DELETE /:id
 * Delete payment account (bendahara only)
 */
router.delete("/:id", paymentAccountController.delete);

/**
 * POST /:id/activate
 * Activate payment account (bendahara only)
 */
router.post("/:id/activate", paymentAccountController.activate);

/**
 * POST /:id/deactivate
 * Deactivate payment account (bendahara only)
 */
router.post("/:id/deactivate", paymentAccountController.deactivate);

export default router;
