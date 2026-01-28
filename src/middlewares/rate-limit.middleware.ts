import { redisClient } from "@/config/redis.config";
import { Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import RedisStore from "rate-limit-redis";

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

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: message || "Too many requests, please try again later.",
      },
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests,
    store: new RedisStore({
      // @ts-expect-error - Known type mismatch with ioredis and rate-limit-redis
      sendCommand: (...args: string[]) => redisClient!.call(...args),
      prefix: `rl:${prefix}:`,
    }),
    // Fallback to memory store if Redis is not connected
    skip: () => !redisClient || redisClient.status !== "ready",
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: message || "Too many requests, please try again later.",
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
  message: "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
  skipSuccessfulRequests: true,
  prefix: "auth",
});

/**
 * General API rate limit
 * 1000 requests per minute
 */
export const generalRateLimit = createLimiter({
  windowMs: 60 * 1000,
  max: 1000,
  message: "Terlalu banyak permintaan. Silakan tunggu sebentar.",
  prefix: "general",
});

/**
 * Moderate rate limit for file uploads
 * 50 requests per 15 minutes
 */
export const uploadRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Terlalu banyak percobaan upload. Silakan coba lagi nanti.",
  prefix: "upload",
});

/**
 * Strict rate limit for sensitive operations (e.g., password change)
 * 30 requests per 15 minutes (Relaxed from 10)
 */
export const strictRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Terlalu banyak percobaan untuk operasi ini. Silakan coba lagi nanti.",
  prefix: "strict",
});
