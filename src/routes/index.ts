import { Router } from 'express';
import authRoutes from './auth.routes.js';
import bendaharaRoutes from './bendahara.routes.js';
import cashBillRoutes from './cash-bill.routes.js';
import cronRoutes from './cron.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import fundApplicationRoutes from './fund-application.routes.js';
import labelsRoutes from './labels.routes.js';
import paymentAccountRoutes from './payment-account.routes.js';
import transactionRoutes from './transaction.routes.js';
import userRoutes from './user.routes.js';

const router: Router = Router();

/**
 * Mount all route modules
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/transactions', transactionRoutes);
router.use('/fund-applications', fundApplicationRoutes);
router.use('/cash-bills', cashBillRoutes);
router.use('/payment-accounts', paymentAccountRoutes);
router.use('/labels', labelsRoutes);
router.use('/bendahara', bendaharaRoutes);
router.use('/cron', cronRoutes);

export default router;
