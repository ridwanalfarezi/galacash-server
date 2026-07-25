import { connectRedis, isRedisAvailable } from './config/redis.config.js';
import { authRateLimit, generalRateLimit } from './middlewares/index.js';
import routes from './routes/index.js';
import { globalErrorHandler } from './utils/errors/index.js';
import { logger } from './utils/logger.js';
import { getPrisma } from './utils/prisma-client.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import fs from 'fs';
import helmet from 'helmet';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Create Express application
 */
const app: Application = express();

// Ensure correct client IPs behind proxies/load balancers (e.g., Vercel)
app.set('trust proxy', 1);

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
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
    xXssProtection: true,
  })
);

/**
 * CORS configuration
 *
 * Since frontend uses proxy/rewrite for /api endpoints:
 * - Browser sees requests as same-origin
 * - CORS is primarily needed for direct API access (mobile apps, external tools)
 * - In production, only explicitly allowed origins should be permitted
 */
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin via proxy)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Ensure managed Redis is ready before request-scoped rate limits and locks run.
 * connectRedis is idempotent, so warm Vercel function instances reuse one client.
 */
app.use(async (_req: Request, _res: Response, next) => {
  if (process.env.REDIS_URL) {
    await connectRedis();
  }
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await getPrisma().$queryRawUnsafe('SELECT 1');
    res.status(200).json({
      success: true,
      message: 'GalaCash API is running',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      services: {
        database: 'up',
        redis: isRedisAvailable ? 'up' : 'degraded',
      },
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'GalaCash API is unavailable',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      services: {
        database: 'down',
        redis: isRedisAvailable ? 'up' : 'degraded',
      },
    });
  }
});

/**
 * Swagger API Documentation
 */
try {
  const swaggerDocument = yaml.load(
    fs.readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8')
  ) as Record<string, unknown>;
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: 'GalaCash API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
    })
  );
  logger.info('📚 Swagger UI available at /api/docs');
} catch (error) {
  logger.warn('Could not load Swagger documentation:', error);
}

/**
 * Apply rate limiting
 */
app.use('/api/auth', authRateLimit);
app.use('/api', generalRateLimit);

/**
 * Mount routes
 */
app.use('/api', routes);

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      path: req.path,
    },
  });
});

/**
 * Global error handler (must be last)
 */
app.use(globalErrorHandler);

export default app;
