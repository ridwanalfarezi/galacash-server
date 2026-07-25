import { generateMonthlyBills } from '../jobs/bill-generator.job.js';
import { logger } from '../utils/logger.js';
import { Request, Response, Router } from 'express';

const router: Router = Router();

/**
 * Accept Vercel's Authorization bearer token while preserving compatibility
 * with the previous Cloud Scheduler header.
 */
function verifyCronRequest(req: Request, res: Response, next: () => void) {
  const cronSecret = process.env.CRON_SECRET || process.env.CRON_SECRET_KEY;

  if (!cronSecret && process.env.NODE_ENV === 'development') {
    logger.warn('Cron secret not configured - allowing request in development mode');
    return next();
  }

  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  const legacyKey = req.headers['x-cloudscheduler-key'] as string | undefined;

  if (cronSecret && (bearerToken === cronSecret || legacyKey === cronSecret)) {
    return next();
  }

  logger.warn('Unauthorized cron request attempt', {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    path: req.path,
  });

  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Invalid or missing cron authentication',
    },
  });
}

/**
 * Trigger monthly bill generation. Vercel Cron invokes this route with GET;
 * POST remains available for authenticated manual runs.
 */
const generateBillsHandler = async (_req: Request, res: Response) => {
  try {
    logger.info('Received scheduled request for bill generation');

    const result = await generateMonthlyBills();

    if (result.skipped) {
      return res.status(423).json({
        success: false,
        error: { code: 'LOCKED', message: result.reason },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Monthly bill generation completed',
      data: { createdCount: result.createdCount, skippedCount: result.skippedCount },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Scheduled bill generation failed:', error);

    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Bill generation failed' },
    });
  }
};

router.get('/generate-bills', verifyCronRequest, generateBillsHandler);
router.post('/generate-bills', verifyCronRequest, generateBillsHandler);

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Cron endpoint is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
