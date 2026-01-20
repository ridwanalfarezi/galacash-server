import { Router } from "express";
import authRoutes from "./auth.routes";
import bendaharaRoutes from "./bendahara.routes";
import cashBillRoutes from "./cash-bill.routes";
import cronRoutes from "./cron.routes";
import dashboardRoutes from "./dashboard.routes";
import fundApplicationRoutes from "./fund-application.routes";
import labelsRoutes from "./labels.routes";
import paymentAccountRoutes from "./payment-account.routes";
import transactionRoutes from "./transaction.routes";
import userRoutes from "./user.routes";

const router: Router = Router();

/**
 * Mount all route modules
 */
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/transactions", transactionRoutes);
router.use("/fund-applications", fundApplicationRoutes);
router.use("/cash-bills", cashBillRoutes);
router.use("/payment-accounts", paymentAccountRoutes);
router.use("/labels", labelsRoutes);
router.use("/bendahara", bendaharaRoutes);
router.use("/cron", cronRoutes);

export default router;
