import { connectRedis, disconnectRedis } from "@/config/redis.config";
import { initializeBillGenerator } from "@/jobs/bill-generator.job";
import { authRateLimit, generalRateLimit } from "@/middlewares";
import routes from "@/routes";
import { globalErrorHandler } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { disconnectPrisma } from "@/utils/prisma-client";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express, { Application, Request, Response } from "express";
import fs from "fs";
import helmet from "helmet";
import yaml from "js-yaml";
import path from "path";
import swaggerUi from "swagger-ui-express";

const PORT = parseInt(process.env.PORT || "3000", 10);
const NODE_ENV = process.env.NODE_ENV || "development";

/**
 * Create Express application
 */
const app: Application = express();

// Ensure correct client IPs behind proxies/load balancers (e.g., Cloud Run)
app.set("trust proxy", true);

/**
 * Security middleware
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xContentTypeOptions: true,
    xFrameOptions: { action: "deny" },
    xXssProtection: true,
  })
);

/**
 * CORS configuration
 */
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400, // 24 hours
  })
);

/**
 * Cookie parser middleware
 */
app.use(cookieParser());

/**
 * Body parsers
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/**
 * Health check endpoint
 */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "GalaCash API is running",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

/**
 * Swagger API Documentation
 */
try {
  const swaggerDocument = yaml.load(
    fs.readFileSync(path.join(__dirname, "../openapi.yaml"), "utf8")
  ) as Record<string, unknown>;
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: "GalaCash API Documentation",
      customCss: ".swagger-ui .topbar { display: none }",
    })
  );
  logger.info("📚 Swagger UI available at /api/docs");
} catch (error) {
  logger.warn("Could not load Swagger documentation:", error);
}

/**
 * Apply rate limiting
 */
app.use("/api/auth", authRateLimit);
app.use("/api", generalRateLimit);

/**
 * Mount routes
 */
app.use("/api", routes);

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
      path: req.path,
    },
  });
});

/**
 * Global error handler (must be last)
 */
app.use(globalErrorHandler);

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
