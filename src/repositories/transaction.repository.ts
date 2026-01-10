import { DatabaseError } from "@/utils/errors";
import { prisma } from "@/utils/prisma-client";
import { Prisma, Transaction } from "@prisma/client";

export interface TransactionFilters {
  classId: string;
  type?: string;
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
  async findAll(filters: TransactionFilters): Promise<PaginatedResponse<Transaction>> {
    const {
      classId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = "date",
      sortOrder = "desc",
    } = filters;

    try {
      const where: Prisma.TransactionWhereInput = {
        classId,
      };

      if (type) {
        where.type = type as any;
      }

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          (where.date as any).gte = startDate;
        }
        if (endDate) {
          (where.date as any).lte = endDate;
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
   * Get chart data for transactions
   */
  async getChartData(
    classId: string,
    type: "income" | "expense",
    startDate?: Date,
    endDate?: Date
  ): Promise<ChartDataPoint[]> {
    try {
      const where: Prisma.TransactionWhereInput = {
        classId,
        type,
      };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          (where.date as any).gte = startDate;
        }
        if (endDate) {
          (where.date as any).lte = endDate;
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

      transactions.forEach((tx) => {
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
}

export const transactionRepository = new TransactionRepository();
