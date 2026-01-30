import Redis from "ioredis";
import { logger } from "../utils/logger";

// let redisClient: Redis | null = null; // Replaced by const export
let isRedisAvailable = false;

/**
 * Initialize Redis client
 */
export const redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      logger.warn("Redis connection failed after 3 retries. Disabling cache.");
      isRedisAvailable = false;
      return null;
    }
    return Math.min(times * 50, 2000);
  },
});

/**
 * Initialize Redis client events
 */
export async function connectRedis(): Promise<void> {
  try {
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
    // await redisClient.ping(); // ioredis connects automatically
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

  return new Promise((resolve) => {
    try {
      // Use SCAN instead of KEYS to avoid blocking the Redis server
      const stream = redisClient!.scanStream({
        match: pattern,
        count: 100,
      });

      const pipeline = redisClient!.pipeline();
      let hasKeys = false;

      stream.on("data", (keys: string[]) => {
        if (keys.length > 0) {
          hasKeys = true;
          pipeline.del(...keys);
        }
      });

      stream.on("end", async () => {
        if (hasKeys) {
          try {
            await pipeline.exec();
          } catch (error) {
            logger.error("Redis DEL pipeline error:", error);
          }
        }
        resolve();
      });

      stream.on("error", (err) => {
        logger.error("Redis SCAN stream error:", err);
        // resolve anyway to avoid breaking flow, but log error
        resolve();
      });
    } catch (error) {
      logger.error("Redis DEL error:", error);
      resolve();
    }
  });
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

export { isRedisAvailable };
