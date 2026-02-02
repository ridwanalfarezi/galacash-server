import app from "@/app";
import { connectRedis, disconnectRedis } from "@/config/redis.config";
import { initializeBillGenerator } from "@/jobs/bill-generator.job";
import { logger } from "@/utils/logger";
import { disconnectPrisma } from "@/utils/prisma-client";

const PORT = parseInt(process.env.PORT || "3000", 10);
const NODE_ENV = process.env.NODE_ENV || "development";

/**
 * Start server
 */
async function startServer() {
  try {
    logger.info("⏳ [STARTUP] Initializing GalaCash server...");
    logger.info(`[STARTUP] Node version: ${process.version}`);
    logger.info(`[STARTUP] Environment: ${NODE_ENV}`);
    logger.info(`[STARTUP] Port: ${PORT}`);
    logger.info(`[STARTUP] DATABASE_URL configured: ${!!process.env.DATABASE_URL}`);
    logger.info(`[STARTUP] PRISMA_DATABASE_URL configured: ${!!process.env.PRISMA_DATABASE_URL}`);

    // Start Express server FIRST (critical for Cloud Run health checks)
    logger.info("[STARTUP] Starting Express server...");
    const server = app.listen(PORT, "0.0.0.0", () => {
      logger.info(`🚀 [STARTUP] Server successfully listening on 0.0.0.0:${PORT}`);
      logger.info(`📍 [STARTUP] Environment: ${NODE_ENV}`);
      logger.info(`🔗 [STARTUP] API Base URL: http://localhost:${PORT}/api`);
      logger.info(`📖 [STARTUP] API Docs: http://localhost:${PORT}/api/docs`);
      logger.info("✅ [STARTUP] Server startup complete - ready to accept requests");
    });

    // Initialize background services AFTER server is listening
    // Connect to Redis (non-blocking, only if configured)
    if (process.env.REDIS_URL) {
      logger.info("[STARTUP] Connecting to Redis...");
      connectRedis().catch((err) => {
        logger.warn("[STARTUP] Redis connection failed, continuing without cache:", err);
      });
    } else {
      logger.info("[STARTUP] Redis not configured, skipping connection");
    }

    // Initialize bill generator cron job (non-blocking)
    // In production (Cloud Run), use Cloud Scheduler to call /api/cron/generate-bills instead
    if (process.env.USE_LOCAL_CRON === "true") {
      setImmediate(() => {
        try {
          logger.info("[STARTUP] Initializing local bill generator cron job...");
          initializeBillGenerator();
        } catch (error) {
          logger.error("[STARTUP] Failed to initialize bill generator:", error);
        }
      });
    } else {
      logger.info(
        "[STARTUP] Local cron disabled - use Cloud Scheduler for /api/cron/generate-bills"
      );
    }

    // Graceful shutdown
    const gracefulShutdown = async () => {
      logger.info("🛑 Shutting down gracefully...");

      server.close(async () => {
        logger.info("✅ HTTP server closed");

        // Disconnect Redis
        await disconnectRedis();

        // Disconnect Prisma
        await disconnectPrisma();

        logger.info("👋 Process terminated");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("❌ Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
