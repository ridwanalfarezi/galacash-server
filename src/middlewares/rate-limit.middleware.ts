import { connectRedis, redisClient } from '../config/redis.config.js';
import { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import RedisStore, { type RedisReply } from 'rate-limit-redis';

/**
 * Helper to create Redis-backed rate limiter
 */
const createLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  prefix: string;
}) => {
  const { windowMs, max, message, skipSuccessfulRequests = false, prefix } = options;
  const store = process.env.REDIS_URL
    ? new RedisStore({
        // RedisStore loads its Lua scripts during construction, before the
        // request middleware has had a chance to establish the connection.
        sendCommand: async (...args: string[]) => {
          await connectRedis();
          if (!redisClient || redisClient.status !== 'ready') {
            throw new Error('Redis is unavailable');
          }
          // @ts-expect-error - ioredis call has command-specific tuple overloads
          return (await redisClient.call(...args)) as RedisReply;
        },
        // ioredis applies REDIS_KEY_PREFIX to EVAL/EVALSHA key arguments.
        prefix: `rl:${prefix}:`,
      })
    : undefined;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: message || 'Too many requests, please try again later.',
      },
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests,
    store,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: message || 'Too many requests, please try again later.',
        },
      });
    },
  });
};

/**
 * Rate limit for auth endpoints
 * 100 requests per 15 minutes (Relaxed from 30)
 */
export const authRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.',
  skipSuccessfulRequests: true,
  prefix: 'auth',
});

/**
 * General API rate limit
 * 1000 requests per minute
 */
export const generalRateLimit = createLimiter({
  windowMs: 60 * 1000,
  max: 1000,
  message: 'Terlalu banyak permintaan. Silakan tunggu sebentar.',
  prefix: 'general',
});

/**
 * Moderate rate limit for file uploads
 * 50 requests per 15 minutes
 */
export const uploadRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Terlalu banyak percobaan upload. Silakan coba lagi nanti.',
  prefix: 'upload',
});

/**
 * Strict rate limit for sensitive operations (e.g., password change)
 * 30 requests per 15 minutes (Relaxed from 10)
 */
export const strictRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Terlalu banyak percobaan untuk operasi ini. Silakan coba lagi nanti.',
  prefix: 'strict',
});
