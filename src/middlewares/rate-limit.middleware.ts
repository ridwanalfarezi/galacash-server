import { logger } from "@/utils/logger";
import { NextFunction, Request, Response } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  },
  10 * 60 * 1000
);

/**
 * Rate limiting middleware
 * Limits requests per IP address
 */
export const rateLimit = (options: {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  const {
    windowMs,
    max,
    message = "Too many requests, please try again later.",
    skipSuccessfulRequests = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Get client identifier (IP address + user agent for better uniqueness)
    const identifier = `${req.ip}-${req.get("user-agent") || "unknown"}`;
    const now = Date.now();

    // Initialize or get existing entry
    if (!store[identifier] || store[identifier].resetTime < now) {
      store[identifier] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Increment request count
    store[identifier].count++;

    // Check if limit exceeded
    if (store[identifier].count > max) {
      logger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message,
        },
      });
      return;
    }

    // Add rate limit headers
    res.setHeader("X-RateLimit-Limit", max.toString());
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - store[identifier].count).toString());
    res.setHeader("X-RateLimit-Reset", new Date(store[identifier].resetTime).toISOString());

    // If skipSuccessfulRequests is true, decrement count on successful responses
    if (skipSuccessfulRequests) {
      const originalSend = res.send;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.send = function (data: any) {
        if (res.statusCode < 400) {
          store[identifier].count--;
        }
        return originalSend.call(this, data);
      };
    }

    next();
  };
};

/**
 * Rate limit for auth endpoints
 * 30 requests per 15 minutes (only failed attempts count due to skipSuccessfulRequests)
 * This allows for retries and multiple login attempts while still preventing brute force
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
});

/**
 * Moderate rate limit for file uploads
 * 30 requests per 10 minutes
 */
export const uploadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  message: "Too many upload attempts, please try again later.",
});

/**
 * General API rate limit
 * 500 requests per minute
 */
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500,
  message: "Too many requests, please slow down.",
});

/**
 * Strict rate limit for sensitive operations
 * 10 requests per 10 minutes
 */
export const strictRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: "Too many attempts for this sensitive operation, please try again later.",
});
