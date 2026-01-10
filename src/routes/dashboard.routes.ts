import { dashboardController } from "@/controllers";
import { authenticate, requireUser, validateQuery } from "@/middlewares";
import { dateRangeSchema } from "@/validators/schemas";
import { Router } from "express";

const router: Router = Router();

// All routes require authentication and user role
router.use(authenticate);
router.use(requireUser);

/**
 * GET /summary
 * Get dashboard summary with optional date range
 */
router.get("/summary", validateQuery(dateRangeSchema), dashboardController.getSummary);

/**
 * GET /pending-bills
 * Get pending cash bills
 */
router.get("/pending-bills", dashboardController.getPendingBills);

/**
 * GET /pending-applications
 * Get pending fund applications
 */
router.get("/pending-applications", dashboardController.getPendingApplications);

export default router;
