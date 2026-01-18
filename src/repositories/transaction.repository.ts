import {
  Prisma,
  Transaction,
  TransactionCategory,
  TransactionType,
} from "@/prisma/generated/client";
import { DatabaseError } from "@/utils/errors";
import { prisma } from "@/utils/prisma-client";

export interface TransactionFilters {
  classId?: string;
  type?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: "date" | "amount" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BalanceData {
  income: number;
  expense: number;
  balance: number;
}

export interface ChartDataPoint {
  date: string;
  amount: number;
}

export class TransactionRepository {
  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Transaction | null> {
    try {
      return await prisma.transaction.findUnique({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch transaction");
      }
      throw error;
    }
  }

  /**
   * Find all transactions with filters and pagination
   */
  async findAll(filters: Partial<TransactionFilters>): Promise<PaginatedResponse<Transaction>> {
    const {
      classId,
      type,
      category,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = "date",
      sortOrder = "desc",
    } = filters;

    try {
      const where: Prisma.TransactionWhereInput = {};

      if (classId) {
        where.classId = classId;
      }

      if (type) {
        where.type = type as TransactionType;
      }

      if (category) {
        where.category = category as TransactionCategory;
      }

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = startDate;
        }
        if (endDate) {
          where.date.lte = endDate;
        }
      }

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        prisma.transaction.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch transactions");
      }
      throw error;
    }
  }

  /**
   * Create new transaction
   */
  async create(data: Prisma.TransactionCreateInput): Promise<Transaction> {
    try {
      return await prisma.transaction.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to create transaction");
      }
      throw error;
    }
  }

  /**
   * Get balance summary for a class
   */
  async getBalance(classId: string): Promise<BalanceData> {
    try {
      const [incomeResult, expenseResult] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            classId,
            type: "income",
          },
          _sum: {
            amount: true,
          },
        }),
        prisma.transaction.aggregate({
          where: {
            classId,
            type: "expense",
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      const income = incomeResult._sum.amount || 0;
      const expense = expenseResult._sum.amount || 0;

      return {
        income,
        expense,
        balance: income - expense,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch balance");
      }
      throw error;
    }
  }

  /**
   * Get chart data for transactions (across all classes)
   */
  async getChartData(
    type: "income" | "expense",
    startDate?: Date,
    endDate?: Date
  ): Promise<ChartDataPoint[]> {
    try {
      const where: Prisma.TransactionWhereInput = {
        type,
      };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = startDate;
        }
        if (endDate) {
          where.date.lte = endDate;
        }
      }

      const transactions = await prisma.transaction.findMany({
        where,
        select: {
          date: true,
          amount: true,
        },
        orderBy: { date: "asc" },
      });

      // Group by date and sum amounts
      const groupedData: Map<string, number> = new Map();

      transactions.forEach((tx: Transaction) => {
        const dateStr = tx.date.toISOString().split("T")[0];
        const current = groupedData.get(dateStr) || 0;
        groupedData.set(dateStr, current + tx.amount);
      });

      return Array.from(groupedData.entries()).map(([date, amount]) => ({
        date,
        amount,
      }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch chart data");
      }
      throw error;
    }
  }

  /**
   * Get transaction breakdown by category (across all classes)
   * Returns data formatted for pie charts: { name, value, fill }
   */
  async getBreakdown(
    type: "income" | "expense",
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ name: string; value: number; fill: string }>> {
    try {
      const where: Prisma.TransactionWhereInput = {
        type,
      };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = startDate;
        }
        if (endDate) {
          where.date.lte = endDate;
        }
      }

      const transactions = await prisma.transaction.findMany({
        where,
        select: {
          category: true,
          amount: true,
        },
      });

      // Group by category and sum amounts
      const categoryMap: Map<string, number> = new Map();

      transactions.forEach((tx) => {
        const category = tx.category || "other";
        const current = categoryMap.get(category) || 0;
        categoryMap.set(category, current + tx.amount);
      });

      // Color palettes
      const incomeColors = [
        "#50b89a",
        "#8cd9a7",
        "#34a0a4",
        "#52b788",
        "#74c69d",
        "#95d5b2",
        "#b7e4c7",
        "#d8f3dc",
      ];
      const expenseColors = [
        "#920c22",
        "#af2038",
        "#800016",
        "#c9184a",
        "#ff4d6d",
        "#c9184a",
        "#a4133c",
        "#800f2f",
      ];

      const colors = type === "income" ? incomeColors : expenseColors;

      // Convert to array and add colors
      const breakdown = Array.from(categoryMap.entries()).map(([category, value], index) => ({
        name: this.formatCategoryName(category),
        value,
        fill: colors[index % colors.length],
      }));

      return breakdown;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch transaction breakdown");
      }
      throw error;
    }
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    const nameMap: Record<string, string> = {
      kas_kelas: "Kas Kelas",
      donation: "Donasi",
      fundraising: "Penggalangan Dana",
      office_supplies: "Alat Tulis Kantor",
      consumption: "Konsumsi",
      event: "Acara",
      maintenance: "Pemeliharaan",
      other: "Lainnya",
    };

    return nameMap[category] || category;
  }
}

export const transactionRepository = new TransactionRepository();
