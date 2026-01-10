import { transactionController } from "@/controllers";
import { authenticate, requireUser, validateQuery } from "@/middlewares";
import { transactionFilterSchema } from "@/validators/schemas";
import { Router } from "express";
import Joi from "joi";

const router: Router = Router();

// All routes require authentication and user role
router.use(authenticate);
router.use(requireUser);

/**
 * GET /
 * Get user transactions with filtering and pagination
 */
router.get("/", validateQuery(transactionFilterSchema), transactionController.getTransactions);

/**
 * GET /chart-data
 * Get transaction chart data
 */
router.get(
  "/chart-data",
  validateQuery(
    Joi.object({
      type: Joi.string().valid("income", "expense").required().messages({
        "any.required": "Type parameter is required",
        "any.only": "Type must be 'income' or 'expense'",
      }),
    })
  ),
  transactionController.getChartData
);

/**
 * GET /:id
 * Get transaction by ID
 */
router.get("/:id", transactionController.getById);

export default router;
