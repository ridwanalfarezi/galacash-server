import { authRateLimit, generalRateLimit } from "@/middlewares";
import routes from "@/routes";
import { globalErrorHandler } from "@/utils/errors";
import { logger } from "@/utils/logger";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import fs from "fs";
import helmet from "helmet";
import yaml from "js-yaml";
import path from "path";
import swaggerUi from "swagger-ui-express";

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

export default app;
