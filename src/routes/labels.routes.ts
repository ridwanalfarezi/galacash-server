import { labelsController } from "@/controllers/labels.controller";
import { Router } from "express";

const router: Router = Router();

/**
 * All label endpoints are public (no authentication required)
 * These are used by frontend for filters, badges, and UI display
 */

/**
 * GET /
 * Get all status labels
 */
router.get("/", labelsController.getAll);

/**
 * GET /bill-statuses
 * Get cash bill status labels
 */
router.get("/bill-statuses", labelsController.getBillStatuses);

/**
 * GET /fund-statuses
 * Get fund application status labels
 */
router.get("/fund-statuses", labelsController.getFundStatuses);

/**
 * GET /fund-categories
 * Get fund category labels
 */
router.get("/fund-categories", labelsController.getFundCategories);

/**
 * GET /transaction-types
 * Get transaction type labels
 */
router.get("/transaction-types", labelsController.getTransactionTypes);

/**
 * GET /transaction-categories
 * Get transaction category labels
 */
router.get("/transaction-categories", labelsController.getTransactionCategories);

/**
 * GET /payment-methods
 * Get payment method labels
 */
router.get("/payment-methods", labelsController.getPaymentMethods);

export default router;
