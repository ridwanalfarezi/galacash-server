import app from './app.js';
import { connectRedis, disconnectRedis } from './config/redis.config.js';
import { validateEnvironment } from './config/env.validation.js';
import { initializeBillGenerator } from './jobs/bill-generator.job.js';
import { logger } from './utils/logger.js';
import { disconnectPrisma } from './utils/prisma-client.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Start server
 */
async function startServer() {
  try {
    logger.info('⏳ [STARTUP] Initializing GalaCash server...');

    // Validate critical environment variables first
    validateEnvironment();

    logger.info(`[STARTUP] Node version: ${process.version}`);
    logger.info(`[STARTUP] Environment: ${NODE_ENV}`);
    logger.info(`[STARTUP] Port: ${PORT}`);
    logger.info(
      `[STARTUP] Database configured: ${!!(
        process.env.POSTGRES_PRISMA_URL ||
        process.env.POSTGRES_URL ||
        process.env.DATABASE_URL
      )}`
    );

    // Vercel supports Express port listeners and also detects the default export below.
    logger.info('[STARTUP] Starting Express server...');
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 [STARTUP] Server successfully listening on 0.0.0.0:${PORT}`);
      logger.info(`📍 [STARTUP] Environment: ${NODE_ENV}`);
      logger.info(`🔗 [STARTUP] API Base URL: http://localhost:${PORT}/api`);
      logger.info(`📖 [STARTUP] API Docs: http://localhost:${PORT}/api/docs`);
      logger.info('✅ [STARTUP] Server startup complete - ready to accept requests');
    });

    // Initialize background services AFTER server is listening
    // Connect to Redis (non-blocking, only if configured)
    if (process.env.REDIS_URL) {
      logger.info('[STARTUP] Connecting to Redis...');
      connectRedis().catch((err) => {
        logger.warn('[STARTUP] Redis connection failed, continuing without cache:', err);
      });
    } else {
      logger.info('[STARTUP] Redis not configured, skipping connection');
    }

    // Initialize bill generator cron job (non-blocking)
    // In production, Vercel Cron invokes /api/cron/generate-bills.
    if (process.env.USE_LOCAL_CRON === 'true') {
      setImmediate(() => {
        try {
          logger.info('[STARTUP] Initializing local bill generator cron job...');
          initializeBillGenerator();
        } catch (error) {
          logger.error('[STARTUP] Failed to initialize bill generator:', error);
        }
      });
    } else {
      logger.info(
        '[STARTUP] Local cron disabled - Vercel Cron will invoke /api/cron/generate-bills'
      );
    }

    // Graceful shutdown
    const gracefulShutdown = async () => {
      logger.info('🛑 Shutting down gracefully...');

      server.close(async () => {
        logger.info('✅ HTTP server closed');

        // Disconnect Redis
        await disconnectRedis();

        // Disconnect Prisma
        await disconnectPrisma();

        logger.info('👋 Process terminated');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
