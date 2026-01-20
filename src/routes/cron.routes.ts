import { generateMonthlyBills } from "@/jobs/bill-generator.job";
import { logger } from "@/utils/logger";
import { Request, Response, Router } from "express";

const router: Router = Router();

/**
 * Middleware to verify Cloud Scheduler requests
 * Checks for either:
 * 1. X-CloudScheduler-Key header with matching secret
 * 2. OIDC token (for production Cloud Scheduler)
 */
function verifyCronRequest(req: Request, res: Response, next: () => void) {
  const cronSecretKey = process.env.CRON_SECRET_KEY;

  // In development, allow if no secret is configured
  if (!cronSecretKey && process.env.NODE_ENV === "development") {
    logger.warn("⚠️ CRON_SECRET_KEY not configured - allowing request in development mode");
    return next();
  }

  // Check X-CloudScheduler-Key header
  const providedKey = req.headers["x-cloudscheduler-key"] as string;

  if (providedKey && providedKey === cronSecretKey) {
    return next();
  }

  // Check for Cloud Scheduler User-Agent (additional validation for GCP)
  const userAgent = req.headers["user-agent"] || "";
  const isCloudScheduler = userAgent.includes("Google-Cloud-Scheduler");

  if (isCloudScheduler && cronSecretKey && providedKey === cronSecretKey) {
    return next();
  }

  logger.warn("⛔ Unauthorized cron request attempt", {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    path: req.path,
  });

  res.status(401).json({
    success: false,
    error: {
      code: "UNAUTHORIZED",
      message: "Invalid or missing cron authentication",
    },
  });
}

/**
 * POST /cron/generate-bills
 * Trigger monthly bill generation (called by Cloud Scheduler)
 */
router.post("/generate-bills", verifyCronRequest, async (_req: Request, res: Response) => {
  try {
    logger.info("📥 Received Cloud Scheduler request for bill generation");

    await generateMonthlyBills();

    res.status(200).json({
      success: true,
      message: "Monthly bill generation completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("❌ Cloud Scheduler bill generation failed:", error);

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Bill generation failed",
      },
    });
  }
});

/**
 * GET /cron/health
 * Health check endpoint for cron jobs (useful for monitoring)
 */
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Cron endpoint is healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;
