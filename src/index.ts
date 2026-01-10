import { connectRedis, disconnectRedis } from "@/config/redis.config";
import { initializeBillGenerator } from "@/jobs/bill-generator.job";
import routes from "@/routes";
import { globalErrorHandler } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { disconnectPrisma } from "@/utils/prisma-client";
import cors from "cors";
import "dotenv/config";
import express, { Application, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

/**
 * Create Express application
 */
const app: Application = express();

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
  })
);

/**
 * CORS configuration
 */
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

/**
 * Rate limiting
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: "Too many authentication attempts, please try again later",
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

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
  const swaggerDocument = YAML.load(path.join(__dirname, "../openapi.yaml"));
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
app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

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
    // Connect to Redis
    await connectRedis();

    // Initialize bill generator cron job
    initializeBillGenerator();

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${NODE_ENV}`);
      logger.info(`🔗 API Base URL: http://localhost:${PORT}/api`);
      logger.info(`📖 API Docs: http://localhost:${PORT}/api/docs`);
    });

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
