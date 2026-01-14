import Redis, { RedisOptions } from "ioredis";
import { logger } from "../utils/logger";

let redisClient: Redis | null = null;
let isRedisAvailable = false;

/**
 * Initialize Redis client
 */
export async function connectRedis(): Promise<void> {
  try {
    const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
    // Log connection target without credentials
    try {
      const urlObj = new URL(REDIS_URL);
      const safeHost = `${urlObj.hostname}:${urlObj.port || "6379"}`;
      logger.info(`🔌 Redis connecting via ${urlObj.protocol} to ${safeHost}`);
    } catch {}

    // Improve compatibility with managed/TLS providers (e.g., Upstash)
    const urlObj = (() => {
      try {
        return new URL(REDIS_URL);
      } catch {
        return null;
      }
    })();
    const isTLS = urlObj?.protocol === "rediss:";
    const isUpstash = urlObj?.hostname?.includes("upstash.io") ?? false;

    const options: RedisOptions = {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn("Redis connection failed after 3 retries. Disabling cache.");
          isRedisAvailable = false;
          return null; // stop retrying
        }
        return Math.min(times * 50, 2000);
      },
      // Some managed providers don't support ready check commands
      enableReadyCheck: isUpstash ? false : true,
      // Ensure TLS is enabled when using rediss:// scheme
      tls: isTLS ? {} : undefined,
    };

    redisClient = new Redis(REDIS_URL, options);

    redisClient.on("connect", () => {
      logger.info("✅ Redis connected successfully");
      isRedisAvailable = true;
    });

    redisClient.on("error", (err) => {
      logger.error("Redis Client Error:", err);
      isRedisAvailable = false;
    });

    redisClient.on("close", () => {
      logger.warn("Redis connection closed");
      isRedisAvailable = false;
    });

    // Test connection
    await redisClient.ping();
  } catch (error) {
    logger.warn("Redis is not available. Running without cache:", error);
    isRedisAvailable = false;
  }
}

/**
 * Safe Redis GET with fallback
 */
export async function safeRedisGet(key: string): Promise<string | null> {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.error("Redis GET error:", error);
    return null;
  }
}

/**
 * Safe Redis SET with fallback
 */
export async function safeRedisSet(key: string, value: string, ttl: number = 3600): Promise<void> {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    await redisClient.setex(key, ttl, value);
  } catch (error) {
    logger.error("Redis SET error:", error);
  }
}

/**
 * Safe Redis DEL with pattern support
 */
export async function safeRedisDel(pattern: string): Promise<void> {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    logger.error("Redis DEL error:", error);
  }
}

/**
 * Disconnect Redis gracefully
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info("Redis disconnected successfully");
      isRedisAvailable = false;
    } catch (error) {
      logger.error("Error disconnecting Redis:", error);
    }
  }
}

export { isRedisAvailable, redisClient };
