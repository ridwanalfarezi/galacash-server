import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger.js';
import {
  acquireRedisLock,
  releaseRedisLock,
  setRedisNx,
  type RedisLockClient,
} from '../utils/redis-lock.js';

export let redisClient: Redis | null = null;
export let isRedisAvailable = false;
let redisConnectionPromise: Promise<void> | null = null;
const redisKeyPrefix = (process.env.REDIS_KEY_PREFIX || '').trim();

/**
 * Initialize Redis client once per warm process/function instance.
 */
export async function connectRedis(): Promise<void> {
  if (redisClient?.status === 'ready' && isRedisAvailable) {
    return;
  }

  if (redisConnectionPromise) {
    return redisConnectionPromise;
  }

  redisConnectionPromise = initializeRedis();

  try {
    await redisConnectionPromise;
  } finally {
    redisConnectionPromise = null;
  }
}

async function initializeRedis(): Promise<void> {
  try {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    // Log connection target without credentials
    try {
      const urlObj = new URL(REDIS_URL);
      const safeHost = `${urlObj.hostname}:${urlObj.port || '6379'}`;
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
    const isTLS = urlObj?.protocol === 'rediss:';
    const isUpstash = urlObj?.hostname?.includes('upstash.io') ?? false;

    const options: RedisOptions = {
      keyPrefix: redisKeyPrefix || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis connection failed after 3 retries. Disabling cache.');
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

    if (redisClient) {
      redisClient.removeAllListeners();
      redisClient.disconnect();
    }

    redisClient = new Redis(REDIS_URL, options);

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
      isRedisAvailable = true;
      logger.info(`Redis key namespace: ${redisKeyPrefix || '(none)'}`);
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      isRedisAvailable = false;
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
      isRedisAvailable = false;
    });

    // Test connection
    await redisClient.ping();
  } catch (error) {
    logger.warn('Redis is not available. Running without cache:', error);
    isRedisAvailable = false;
    redisClient?.disconnect();
    redisClient = null;
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
    logger.error('Redis GET error:', error);
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
    logger.error('Redis SET error:', error);
  }
}

/**
 * Safe Redis EXISTS with fallback
 * Returns true if key exists, false otherwise
 */
export async function safeRedisExists(key: string): Promise<boolean> {
  if (!isRedisAvailable || !redisClient) {
    return false;
  }

  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Redis EXISTS error:', error);
    return false;
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
        // ioredis does not apply keyPrefix to SCAN patterns.
        match: `${redisKeyPrefix}${pattern}`,
        count: 100,
      });

      const pipeline = redisClient!.pipeline();
      let hasKeys = false;

      stream.on('data', (keys: string[]) => {
        // SCAN returns physical keys. Remove the namespace before passing them
        // to a prefixed pipeline so the prefix is not applied twice.
        const logicalKeys = redisKeyPrefix
          ? keys
              .filter((key) => key.startsWith(redisKeyPrefix))
              .map((key) => key.slice(redisKeyPrefix.length))
          : keys;

        if (logicalKeys.length > 0) {
          hasKeys = true;
          pipeline.del(...logicalKeys);
        }
      });

      stream.on('end', async () => {
        if (hasKeys) {
          try {
            await pipeline.exec();
          } catch (error) {
            logger.error('Redis DEL pipeline error:', error);
          }
        }
        resolve();
      });

      stream.on('error', (err) => {
        logger.error('Redis SCAN stream error:', err);
        // resolve anyway to avoid breaking flow, but log error
        resolve();
      });
    } catch (error) {
      logger.error('Redis DEL error:', error);
      resolve();
    }
  });
}

/**
 * Safe Redis INCR with fallback
 */
export async function safeRedisIncr(key: string): Promise<number | null> {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    return await redisClient.incr(key);
  } catch (error) {
    logger.error('Redis INCR error:', error);
    return null;
  }
}

/**
 * Acquire a distributed lock with a cryptographically unique fencing token.
 * Fails closed (returns acquired: false) if Redis is unavailable or lock is taken.
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number = 10
): Promise<{ acquired: boolean; token: string }> {
  if (!isRedisAvailable || !redisClient) {
    logger.warn(`Redis unavailable when acquiring lock for key: ${key}`);
    return { acquired: false, token: '' };
  }

  try {
    return await acquireRedisLock(
      redisClient as unknown as RedisLockClient,
      key,
      ttlSeconds,
      (error) => logger.error(`Failed to acquire lock for key ${key}:`, error)
    );
  } catch {
    return { acquired: false, token: '' };
  }
}

export async function releaseLock(key: string, token: string): Promise<boolean> {
  if (!isRedisAvailable || !redisClient || !token) {
    return false;
  }

  return releaseRedisLock(redisClient as unknown as RedisLockClient, key, token, (error) =>
    logger.error(`Failed to release lock for key ${key}:`, error)
  );
}

/**
 * Safe Redis SET NX (set-if-not-exists) with TTL — used for distributed locking.
 * Returns true if the lock was acquired, false if it already exists or on error.
 * Fails closed (returns false) when Redis is unavailable to prevent unhedged concurrency.
 */
export async function safeRedisSetNX(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<boolean> {
  if (!isRedisAvailable || !redisClient) {
    return false; // Fail closed — no Redis, cannot guarantee exclusive lock
  }

  return setRedisNx(redisClient as unknown as RedisLockClient, key, value, ttlSeconds, (error) =>
    logger.error('Redis SETNX error:', error)
  );
}

/**
 * Disconnect Redis gracefully
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis disconnected successfully');
      isRedisAvailable = false;
    } catch (error) {
      logger.error('Error disconnecting Redis:', error);
    }
  }
}
