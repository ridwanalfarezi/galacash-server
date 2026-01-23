import { uploadAttachment } from "@/config/multer.config";
import { bendaharaController } from "@/controllers";
import {
  authenticate,
  handleFileUpload,
  requireBendahara,
  validateBody,
  validateQuery,
} from "@/middlewares";
import {
  cashBillFilterSchema,
  createTransactionSchema,
  rekapKasFilterSchema,
  reviewFundApplicationSchema,
} from "@/validators/schemas";
import { Router } from "express";

const router: Router = Router();

// All routes require authentication and bendahara role
router.use(authenticate);
router.use(requireBendahara);

/**
 * GET /dashboard
 * Get bendahara dashboard with overview
 */
router.get("/dashboard", bendaharaController.getDashboard);

/**
 * POST /fund-applications/:id/approve
 * Approve a fund application
 */
router.post("/fund-applications/:id/approve", bendaharaController.approveFundApplication);

/**
 * POST /fund-applications/:id/reject
 * Reject a fund application with reason
 */
router.post(
  "/fund-applications/:id/reject",
  validateBody(reviewFundApplicationSchema),
  bendaharaController.rejectFundApplication
);

/**
 * GET /cash-bills
 * Get all cash bills with filtering
 */
router.get("/cash-bills", validateQuery(cashBillFilterSchema), bendaharaController.getAllCashBills);

/**
 * POST /cash-bills/:id/confirm-payment
 * Confirm a cash bill payment
 */
router.post("/cash-bills/:id/confirm-payment", bendaharaController.confirmPayment);

/**
 * POST /cash-bills/:id/reject-payment
 * Reject a cash bill payment
 */
router.post("/cash-bills/:id/reject-payment", bendaharaController.rejectPayment);

/**
 * GET /rekap-kas
 * Get cash recap with date range and grouping
 */
router.get("/rekap-kas", validateQuery(rekapKasFilterSchema), bendaharaController.getRekapKas);

/**
 * GET /students
 * Get all students list
 */
router.get("/students", bendaharaController.getStudents);

/**
 * POST /transactions
 * Create manual transaction (income/expense)
 */
router.post(
  "/transactions",
  uploadAttachment.single("attachment"),
  handleFileUpload("transactions"),
  validateBody(createTransactionSchema),
  bendaharaController.createTransaction
);

export default router;
