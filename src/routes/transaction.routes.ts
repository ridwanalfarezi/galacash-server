import { transactionController } from "@/controllers";
import { authenticate, validateQuery } from "@/middlewares";
import { transactionFilterSchema } from "@/validators/schemas";
import { Router } from "express";
import Joi from "joi";

const router: Router = Router();

// All routes require authentication
router.use(authenticate);
// Allow both user and bendahara roles to access transactions

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
 * GET /breakdown
 * Get transaction breakdown by category for pie charts
 */
router.get(
  "/breakdown",
  validateQuery(
    Joi.object({
      type: Joi.string().valid("income", "expense").required().messages({
        "any.required": "Type parameter is required",
        "any.only": "Type must be 'income' or 'expense'",
      }),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
    })
  ),
  transactionController.getBreakdown
);

/**
 * GET /export
 * Export transactions to Excel or CSV
 */
router.get(
  "/export",
  validateQuery(
    Joi.object({
      format: Joi.string().valid("excel", "csv").default("excel").messages({
        "any.only": "Format must be 'excel' or 'csv'",
      }),
      type: Joi.string().valid("income", "expense").optional(),
      category: Joi.string().optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
      search: Joi.string().optional(),
    })
  ),
  transactionController.exportTransactions
);

/**
 * GET /:id
 * Get transaction by ID
 */
router.get("/:id", transactionController.getById);

export default router;
