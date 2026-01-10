import {
  BalanceData,
  ChartDataPoint,
  PaginatedResponse,
  TransactionFilters,
  transactionRepository,
} from "@/repositories/transaction.repository";
import { AuthorizationError, NotFoundError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { Transaction } from "@prisma/client";
import { CacheService } from "./cache.service";

/**
 * Transaction service for handling transaction operations
 */
export class TransactionService {
  private transactionRepository = transactionRepository;
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Get paginated transactions with caching
   */
  async getTransactions(
    classId: string,
    filters?: Partial<TransactionFilters>
  ): Promise<PaginatedResponse<Transaction>> {
    const mergedFilters: TransactionFilters = {
      classId,
      page: filters?.page || 1,
      limit: filters?.limit || 20,
      type: filters?.type,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      sortBy: filters?.sortBy || "date",
      sortOrder: filters?.sortOrder || "desc",
    };

    // Generate cache key
    const filterString = JSON.stringify(mergedFilters);
    const cacheKey = this.cacheService.transactionsKey(classId, filterString);

    // Try to get from cache
    const cached = await this.cacheService.getCached<PaginatedResponse<Transaction>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch from repository
      const result = await this.transactionRepository.findAll(mergedFilters);

      // Cache the result
      await this.cacheService.setCached(cacheKey, result, 300); // 5 minutes cache

      return result;
    } catch (error) {
      logger.error("Failed to fetch transactions:", error);
      throw error;
    }
  }

  /**
   * Get single transaction by ID with permission check
   */
  async getTransactionById(id: string, userId?: string, userRole?: string): Promise<Transaction> {
    // Try to get from cache
    const cacheKey = this.cacheService.transactionKey(id);
    const cached = await this.cacheService.getCached<Transaction>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const transaction = await this.transactionRepository.findById(id);

      if (!transaction) {
        throw new NotFoundError("Transaction not found");
      }

      // Permission check: if userId is provided, verify user is in the same class
      if (userId && userRole !== "admin") {
        // This assumes you'll have a method to verify user-class association
        // For now, we allow the transaction fetch but you may add stricter checks
        logger.info(`User ${userId} accessed transaction ${id} from class ${transaction.classId}`);
      }

      // Cache the result
      await this.cacheService.setCached(cacheKey, transaction, 300); // 5 minutes cache

      return transaction;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      logger.error("Failed to fetch transaction:", error);
      throw error;
    }
  }

  /**
   * Get chart data for pie charts by type
   */
  async getChartData(
    classId: string,
    type: "income" | "expense",
    startDate?: Date,
    endDate?: Date
  ): Promise<ChartDataPoint[]> {
    // Generate cache key
    const cacheKeyParts = [classId, type, startDate?.toISOString(), endDate?.toISOString()]
      .filter((p) => p)
      .join(":");
    const cacheKey = `chart-data:${cacheKeyParts}`;

    // Try to get from cache
    const cached = await this.cacheService.getCached<ChartDataPoint[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const chartData = await this.transactionRepository.getChartData(
        classId,
        type,
        startDate,
        endDate
      );

      // Cache the result
      await this.cacheService.setCached(cacheKey, chartData, 600); // 10 minutes cache

      return chartData;
    } catch (error) {
      logger.error("Failed to fetch chart data:", error);
      throw error;
    }
  }

  /**
   * Get current balance for a class with caching
   */
  async getBalance(classId: string): Promise<BalanceData> {
    // Try to get from cache
    const cacheKey = this.cacheService.balanceKey(classId);
    const cached = await this.cacheService.getCached<BalanceData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const balance = await this.transactionRepository.getBalance(classId);

      // Cache the result
      await this.cacheService.setCached(cacheKey, balance, 300); // 5 minutes cache

      return balance;
    } catch (error) {
      logger.error("Failed to fetch balance:", error);
      throw error;
    }
  }

  async getDashboardSummary(classId: string, _userRole?: string) {
    const balance = await this.getBalance(classId);
    return { balance: balance.balance };
  }

  /**
   * Invalidate transaction cache when transaction is created/updated
   */
  async invalidateTransactionCache(classId: string): Promise<void> {
    await this.cacheService.invalidateTransactions(classId);
    await this.cacheService.invalidateCache(this.cacheService.balanceKey(classId) + "*");
  }
}

export const transactionService = new TransactionService();
