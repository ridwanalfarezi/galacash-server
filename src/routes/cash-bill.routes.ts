import { uploadPaymentProof } from '@/config/multer.config';
import { cashBillController } from '@/controllers';
import { authenticate, uploadRateLimit, validateBody, validateQuery } from '@/middlewares';
import { handleFileUpload } from '@/middlewares/upload.middleware';
import { cashBillFilterSchema } from '@/validators/schemas';
import { Router } from 'express';
import Joi from 'joi';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);
// Allow both user and bendahara roles to access cash bills

/**
 * GET /my
 * Get user's cash bills with filtering and pagination
 */
router.get('/my', validateQuery(cashBillFilterSchema), cashBillController.getMyBills);

/**
 * GET /
 * Get all cash bills with filtering and pagination
 */
router.get('/', validateQuery(cashBillFilterSchema), cashBillController.getMyBills);

/**
 * POST /batch-pay
 * Pay multiple cash bills at once with a single payment proof
 */
router.post(
  '/batch-pay',
  uploadRateLimit,
  uploadPaymentProof.single('paymentProof'),
  handleFileUpload('payments'),
  validateBody(
    Joi.object({
      billIds: Joi.string().required().messages({
        'any.required': 'Bill IDs are required',
      }),
      paymentMethod: Joi.string().valid('bank', 'ewallet', 'cash').required().messages({
        'any.required': 'Payment method is required',
        'any.only': "Payment method must be 'bank', 'ewallet', or 'cash'",
      }),
    })
  ),
  // Parse billIds from JSON string (multipart/form-data sends everything as strings)
  (
    req: import('express').Request,
    _res: import('express').Response,
    next: import('express').NextFunction
  ) => {
    if (typeof req.body.billIds === 'string') {
      try {
        req.body.billIds = JSON.parse(req.body.billIds);
      } catch {
        // Leave as-is, controller will validate
      }
    }
    next();
  },
  cashBillController.batchPay
);

/**
 * GET /:id
 * Get cash bill by ID
 */
router.get('/:id', cashBillController.getById);

/**
 * POST /:id/pay
 * Pay a cash bill with payment proof
 */
router.post(
  '/:id/pay',
  uploadRateLimit,
  uploadPaymentProof.single('paymentProof'),
  handleFileUpload('payments'),
  validateBody(
    Joi.object({
      paymentMethod: Joi.string().valid('bank', 'ewallet', 'cash').required().messages({
        'any.required': 'Payment method is required',
        'any.only': "Payment method must be 'bank', 'ewallet', or 'cash'",
      }),
      paymentAccountId: Joi.string().uuid().optional().messages({
        'string.guid': 'Payment account ID must be a valid UUID',
      }),
    })
  ),
  cashBillController.pay
);

/**
 * POST /:id/cancel-payment
 * Cancel a pending payment
 */
router.post('/:id/cancel-payment', cashBillController.cancelPayment);

export default router;
