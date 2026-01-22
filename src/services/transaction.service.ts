import { Prisma, Transaction } from "@/prisma/generated/client";
import {
  BalanceData,
  ChartDataPoint,
  PaginatedResponse,
  TransactionFilters,
  transactionRepository,
} from "@/repositories/transaction.repository";
import { AuthorizationError, NotFoundError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { prisma } from "@/utils/prisma-client";
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
   * Get paginated transactions with caching (across all classes for transparency)
   */
  async getTransactions(
    filters?: Partial<TransactionFilters>
  ): Promise<PaginatedResponse<Transaction>> {
    const mergedFilters: Partial<TransactionFilters> = {
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
    const cacheKey = this.cacheService.transactionsKey("all", filterString);

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
   * Get chart data for pie charts by type (across all classes)
   */
  async getChartData(
    type: "income" | "expense",
    startDate?: Date,
    endDate?: Date
  ): Promise<ChartDataPoint[]> {
    // Generate cache key
    const cacheKeyParts = ["all", type, startDate?.toISOString(), endDate?.toISOString()]
      .filter((p) => p)
      .join(":");
    const cacheKey = `chart-data:${cacheKeyParts}`;

    // Try to get from cache
    const cached = await this.cacheService.getCached<ChartDataPoint[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const chartData = await this.transactionRepository.getChartData(type, startDate, endDate);

      // Cache the result
      await this.cacheService.setCached(cacheKey, chartData, 600); // 10 minutes cache

      return chartData;
    } catch (error) {
      logger.error("Failed to fetch chart data:", error);
      throw error;
    }
  }

  /**
   * Get transaction breakdown by category for pie charts (across all classes)
   * Returns { name, value, fill } format for frontend
   */
  async getBreakdown(
    type: "income" | "expense",
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ name: string; value: number; fill: string }>> {
    const cacheKeyParts = [
      "breakdown",
      "all",
      type,
      startDate?.toISOString(),
      endDate?.toISOString(),
    ]
      .filter((p) => p)
      .join(":");
    const cacheKey = `${cacheKeyParts}`;

    // Try to get from cache
    const cached =
      await this.cacheService.getCached<Array<{ name: string; value: number; fill: string }>>(
        cacheKey
      );
    if (cached) {
      return cached;
    }

    try {
      const breakdown = await this.transactionRepository.getBreakdown(type, startDate, endDate);

      // Cache the result
      await this.cacheService.setCached(cacheKey, breakdown, 600); // 10 minutes cache

      return breakdown;
    } catch (error) {
      logger.error("Failed to fetch transaction breakdown:", error);
      throw error;
    }
  }

  /**
   * Get total balance across all classes with caching (for transparency)
   * FIXED: Use repository aggregate instead of fetching 100k rows
   */
  async getBalance(): Promise<BalanceData> {
    // Try to get from cache
    const cacheKey = this.cacheService.balanceKey("all");
    const cached = await this.cacheService.getCached<BalanceData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Use repository's aggregate method (already optimized with SQL)
      const balance = await this.transactionRepository.getBalance();

      // Prisma aggregates return Decimal, convert to number for API consistency
      const balanceData: BalanceData = {
        income: Number(balance.income),
        expense: Number(balance.expense),
        balance: Number(balance.balance),
      };

      // Cache the result
      await this.cacheService.setCached(cacheKey, balanceData, 300); // 5 minutes cache

      return balanceData;
    } catch (error) {
      logger.error("Failed to fetch balance:", error);
      throw error;
    }
  }

  async getDashboardSummary(startDate?: Date, endDate?: Date) {
    // If date range is provided, use aggregation
    if (startDate || endDate) {
      const where: Prisma.TransactionWhereInput = {};
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = startDate;
        if (endDate) where.date.lte = endDate;
      }

      // Use SQL aggregation instead of fetching all rows
      const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ...where, type: "income" },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { ...where, type: "expense" },
          _sum: { amount: true },
        }),
      ]);

      const totalIncome = Number(incomeAgg._sum.amount || 0);
      const totalExpense = Number(expenseAgg._sum.amount || 0);

      return {
        totalIncome,
        totalExpense,
        totalBalance: totalIncome - totalExpense,
      };
    }

    // No date filter, get full balance (across all classes)
    const balance = await this.getBalance();
    return {
      totalIncome: balance.income,
      totalExpense: balance.expense,
      totalBalance: balance.balance,
    };
  }

  /**
   * Invalidate transaction cache when transaction is created/updated
   */
  async invalidateTransactionCache(): Promise<void> {
    await this.cacheService.invalidateTransactions("all");
    await this.cacheService.invalidateCache(this.cacheService.balanceKey("all") + "*");
  }
}

export const transactionService = new TransactionService();
