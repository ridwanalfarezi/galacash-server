import {
  safeRedisDel,
  safeRedisExists,
  safeRedisGet,
  safeRedisIncr,
  safeRedisSet,
} from '@/config/redis.config';
import { logger } from '@/utils/logger';

const DEFAULT_TTL = 3600; // 1 hour

/**
 * Cache service for managing Redis cache operations
 */
export class CacheService {
  // ============ KEY GENERATORS ============

  userKey(userId: string): string {
    return `user:${userId}`;
  }

  userByNimKey(nim: string): string {
    return `user:nim:${nim}`;
  }

  userVersionKey(userId: string): string {
    return `user:token_version:${userId}`;
  }

  transactionKey(transactionId: string): string {
    return `transaction:${transactionId}`;
  }

  transactionsKey(classId: string, filters: string): string {
    return `transactions:${classId}:${filters}`;
  }

  balanceKey(classId: string): string {
    return `balance:${classId}`;
  }

  async getFinancialEpoch(classId: string = 'global'): Promise<number> {
    const key = `epoch:finance:${classId}`;
    const epoch = await safeRedisGet(key);
    return epoch ? parseInt(epoch, 10) : 1;
  }

  async incrementFinancialEpoch(classId: string = 'global'): Promise<number> {
    const key = `epoch:finance:${classId}`;
    const newEpoch = await safeRedisIncr(key);
    logger.info(`Financial epoch incremented for ${classId}: v${newEpoch}`);
    return newEpoch ?? 1;
  }

  async getVersionedBalanceKey(classId: string = 'all'): Promise<string> {
    const epoch = await this.getFinancialEpoch(classId);
    return `balance:${classId}:v${epoch}`;
  }

  async getVersionedDashboardKey(classId: string = 'all', extra: string = 'all'): Promise<string> {
    const epoch = await this.getFinancialEpoch(classId);
    return `bendahara-dashboard:${classId}:${extra}:v${epoch}`;
  }

  fundApplicationKey(id: string): string {
    return `fund-application:${id}`;
  }

  fundApplicationsKey(filters: string): string {
    return `fund-applications:${filters}`;
  }

  cashBillKey(id: string): string {
    return `cash-bill:${id}`;
  }

  cashBillsKey(userId: string, filters: string): string {
    return `cash-bills:${userId}:${filters}`;
  }

  dashboardKey(userId: string, filters: string): string {
    return `dashboard:${userId}:${filters}`;
  }

  tokenBlacklistKey(token: string): string {
    return `token:blacklist:${token}`;
  }

  // ============ CACHE OPERATIONS ============

  /**
   * Get data from cache
   */
  async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = await safeRedisGet(key);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async setCached(key: string, data: unknown, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      await safeRedisSet(key, JSON.stringify(data), ttl);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCache(pattern: string): Promise<void> {
    try {
      await safeRedisDel(pattern);
      logger.info(`Cache invalidated: ${pattern}`);
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }

  // ============ INVALIDATION HELPERS ============

  async invalidateUser(userId: string): Promise<void> {
    await this.invalidateCache(`user:${userId}*`);
  }

  async invalidateTransactions(classId: string = 'all'): Promise<void> {
    await this.incrementFinancialEpoch(classId);
    await this.invalidateCache(`transactions:${classId}*`);
    await this.invalidateCache(`balance:${classId}*`);
  }

  async invalidateFundApplications(): Promise<void> {
    await this.invalidateCache(`fund-application*`);
  }

  async invalidateCashBills(userId?: string): Promise<void> {
    if (userId) {
      await this.invalidateCache(`cash-bills:${userId}*`);
      await this.invalidateCache(`cash-bill:*`);
    } else {
      await this.invalidateCache(`cash-bill*`);
    }
  }

  async invalidateDashboard(userId: string): Promise<void> {
    await this.invalidateCache(`dashboard:${userId}*`);
  }

  // ============ TOKEN BLACKLIST OPERATIONS ============

  async addToTokenBlacklist(token: string, ttlSeconds: number): Promise<void> {
    const key = this.tokenBlacklistKey(token);
    await this.setCached(key, '1', ttlSeconds);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = this.tokenBlacklistKey(token);
    return safeRedisExists(key);
  }
}

export const cacheService = new CacheService();
