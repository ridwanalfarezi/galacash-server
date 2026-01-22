import {
  CashBill,
  FundApplication,
  Prisma,
  Transaction,
  TransactionCategory,
  User,
} from "@/prisma/generated/client";
import {
  PaginatedResponse as BillPaginatedResponse,
  CashBillFilters,
  cashBillRepository,
} from "@/repositories/cash-bill.repository";
import { fundApplicationRepository } from "@/repositories/fund-application.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { userRepository } from "@/repositories/user.repository";
import { BusinessLogicError, NotFoundError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { prisma } from "@/utils/prisma-client";
import { CacheService } from "./cache.service";

export interface DashboardData {
  pendingApplications: number;
  pendingPayments: number;
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalStudents: number;
  recentTransactions: Transaction[];
  recentFundApplications: FundApplication[];
  recentCashBills: CashBill[];
}

export interface RekapKasData {
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  transactionCount: number;
}

/**
 * Bendahara (treasurer) service for managing class finances
 */
export class BendaharaService {
  private fundApplicationRepository = fundApplicationRepository;
  private cashBillRepository = cashBillRepository;
  private transactionRepository = transactionRepository;
  private userRepository = userRepository;
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Get dashboard with pending applications, payments, and total balance
   */
  async getDashboard(): Promise<DashboardData> {
    // Check cache first - use global cache key since data includes all classes
    const cacheKey = `bendahara-dashboard:all`;
    const cached = await this.cacheService.getCached<DashboardData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get pending applications count (efficient)
      const pendingApplicationsCount =
        await this.fundApplicationRepository.countByStatus("pending");

      // Get pending payments count (efficient)
      const pendingPaymentsCount =
        await this.cashBillRepository.countByStatus("menunggu_konfirmasi");

      // Get total balance (all classes)
      const balance = await this.transactionRepository.getBalance();

      // Get recent transactions (last 10, all classes)
      const recentTransactionsResult = await this.transactionRepository.findAll({
        page: 1,
        limit: 10,
      });

      // Get recent fund applications (last 5 pending, all classes)
      const recentFundApplicationsResult = await this.fundApplicationRepository.findAll({
        status: "pending",
        page: 1,
        limit: 5,
      });

      // Get recent cash bills (last 5 pending, all classes)
      const recentCashBillsResult = await this.cashBillRepository.findAll({
        status: "menunggu_konfirmasi",
        page: 1,
        limit: 5,
      });

      // Get students count (efficient)
      const studentsCount = await prisma.user.count({
        where: { role: "user" },
      });

      // Calculate total income and expense from recent transactions
      let totalIncome = 0;
      let totalExpense = 0;

      for (const transaction of recentTransactionsResult.data) {
        if (transaction.type === "income") {
          totalIncome += Number(transaction.amount);
        } else {
          totalExpense += Number(transaction.amount);
        }
      }

      const dashboardData: DashboardData = {
        pendingApplications: pendingApplicationsCount,
        pendingPayments: pendingPaymentsCount,
        totalBalance: balance.balance,
        totalIncome,
        totalExpense,
        totalStudents: studentsCount,
        recentTransactions: recentTransactionsResult.data,
        recentFundApplications: recentFundApplicationsResult.data,
        recentCashBills: recentCashBillsResult.data,
      };

      // Cache the result
      await this.cacheService.setCached(cacheKey, dashboardData, 300); // 5 minutes cache

      return dashboardData;
    } catch (error) {
      logger.error("Failed to fetch bendahara dashboard:", error);
      throw error;
    }
  }

  /**
   * Approve fund application and auto-create expense transaction
   * FIXED: Wrapped in database transaction for atomicity
   */
  async approveFundApplication(
    applicationId: string,
    bendaharaId: string
  ): Promise<FundApplication> {
    try {
      // Use database transaction to ensure atomicity
      const updatedApplication = await prisma.$transaction(async (tx) => {
        // Get the application within transaction
        const application = await tx.fundApplication.findUnique({
          where: { id: applicationId },
        });

        if (!application) {
          throw new NotFoundError("Fund application not found", "FundApplication");
        }

        // Check if already reviewed
        if (application.status !== "pending") {
          throw new BusinessLogicError(
            `Cannot approve application with status '${application.status}'. Only pending applications can be approved.`
          );
        }

        // Update application status (within transaction)
        const updated = await tx.fundApplication.update({
          where: { id: applicationId },
          data: {
            status: "approved",
            reviewer: {
              connect: { id: bendaharaId },
            },
            reviewedAt: new Date(),
          },
          include: {
            user: true,
            reviewer: true,
          },
        });

        // Auto-create expense transaction (within same transaction)
        await tx.transaction.create({
          data: {
            class: {
              connect: { id: application.classId },
            },
            type: "expense",
            category: this.mapFundCategoryToTransactionCategory(application.category),
            description: `Fund approval: ${application.purpose}`,
            amount: application.amount,
            date: new Date(),
          },
        });

        return updated;
      });

      // Invalidate caches (outside transaction)
      await this.invalidateBendaharaCaches();

      logger.info(`Fund application approved: ${applicationId} by bendahara ${bendaharaId}`);

      return updatedApplication;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        throw error;
      }
      logger.error("Failed to approve fund application:", error);
      throw error;
    }
  }

  /**
   * Reject fund application with reason
   */
  async rejectFundApplication(
    applicationId: string,
    bendaharaId: string,
    reason: string
  ): Promise<FundApplication> {
    try {
      // Get the application
      const application = await this.fundApplicationRepository.findById(applicationId);

      if (!application) {
        throw new NotFoundError("Fund application not found", "FundApplication");
      }

      // Check if already reviewed
      if (application.status !== "pending") {
        throw new BusinessLogicError(
          `Cannot reject application with status '${application.status}'. Only pending applications can be rejected.`
        );
      }

      // Update application status
      const updatedApplication = await this.fundApplicationRepository.update(applicationId, {
        status: "rejected",
        reviewer: {
          connect: { id: bendaharaId },
        },
        reviewedAt: new Date(),
        rejectionReason: reason,
      });

      // Invalidate caches
      await this.invalidateBendaharaCaches();

      logger.info(
        `Fund application rejected: ${applicationId} by bendahara ${bendaharaId} with reason: ${reason}`
      );

      return updatedApplication;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        throw error;
      }
      logger.error("Failed to reject fund application:", error);
      throw error;
    }
  }

  /**
   * Get all cash bills (across all classes)
   */
  async getAllCashBills(
    filters?: Partial<CashBillFilters>
  ): Promise<BillPaginatedResponse<CashBill>> {
    const mergedFilters: CashBillFilters = {
      page: filters?.page || 1,
      limit: filters?.limit || 20,
      status: filters?.status,
      month: filters?.month,
      year: filters?.year,
    };

    // Generate cache key
    const filterString = JSON.stringify(mergedFilters);
    const cacheKey = `bendahara-bills:all:${filterString}`;

    // Try to get from cache
    const cached = await this.cacheService.getCached<BillPaginatedResponse<CashBill>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.cashBillRepository.findAll(mergedFilters);

      // Cache the result
      await this.cacheService.setCached(cacheKey, result, 300); // 5 minutes cache

      return result;
    } catch (error) {
      logger.error("Failed to fetch cash bills for bendahara:", error);
      throw error;
    }
  }

  /**
   * Confirm payment and auto-create income transaction
   * FIXED: Wrapped in database transaction with optimistic locking to prevent race conditions
   */
  async confirmPayment(billId: string, bendaharaId: string): Promise<CashBill> {
    try {
      // Use database transaction with optimistic locking
      const updatedBill = await prisma.$transaction(async (tx) => {
        // Get the bill within transaction
        const bill = await tx.cashBill.findUnique({
          where: { id: billId },
        });

        if (!bill) {
          throw new NotFoundError("Cash bill not found", "CashBill");
        }

        // Check if payment is waiting for confirmation
        if (bill.status !== "menunggu_konfirmasi") {
          throw new BusinessLogicError(
            `Cannot confirm bill with status '${bill.status}'. Only bills waiting for confirmation can be confirmed.`
          );
        }

        // Update with WHERE clause to ensure status hasn't changed (optimistic locking)
        const updateResult = await tx.cashBill.updateMany({
          where: {
            id: billId,
            status: "menunggu_konfirmasi", // Ensure status is still pending
          },
          data: {
            status: "sudah_dibayar",
            confirmedBy: bendaharaId,
            confirmedAt: new Date(),
          },
        });

        // Check if update actually happened (race condition check)
        if (updateResult.count === 0) {
          throw new BusinessLogicError(
            "Bill status changed during confirmation. Please try again."
          );
        }

        // Auto-create income transaction (within same transaction)
        await tx.transaction.create({
          data: {
            class: {
              connect: { id: bill.classId },
            },
            type: "income",
            category: "kas_kelas" as TransactionCategory,
            description: `Bill payment confirmed: ${bill.billId}`,
            amount: bill.totalAmount,
            date: new Date(),
          },
        });

        // Fetch and return updated bill with relations
        const updated = await tx.cashBill.findUnique({
          where: { id: billId },
          include: {
            user: true,
            class: true,
            confirmer: true,
          },
        });

        return updated!;
      });

      // Invalidate caches (outside transaction)
      await this.invalidateBendaharaCaches();

      logger.info(`Bill payment confirmed: ${billId} by bendahara ${bendaharaId}`);

      return updatedBill;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        throw error;
      }
      logger.error("Failed to confirm bill payment:", error);
      throw error;
    }
  }

  /**
   * Reject payment and revert bill to belum_dibayar
   */
  async rejectPayment(billId: string, reason?: string): Promise<CashBill> {
    try {
      // Get the bill
      const bill = await this.cashBillRepository.findById(billId);

      if (!bill) {
        throw new NotFoundError("Cash bill not found", "CashBill");
      }

      // Check if payment is waiting for confirmation
      if (bill.status !== "menunggu_konfirmasi") {
        throw new BusinessLogicError(
          `Cannot reject bill with status '${bill.status}'. Only bills waiting for confirmation can be rejected.`
        );
      }

      // Revert to belum_dibayar and clear payment info
      const updatedBill = await this.cashBillRepository.update(billId, {
        status: "belum_dibayar",
        paymentMethod: null,
        paymentProofUrl: null,
        paidAt: null,
      });

      // Invalidate caches
      await this.invalidateBendaharaCaches();

      logger.info(`Bill payment rejected: ${billId}${reason ? ` with reason: ${reason}` : ""}`);

      return updatedBill;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        throw error;
      }
      logger.error("Failed to reject bill payment:", error);
      throw error;
    }
  }

  /**
   * Get financial summary (rekap kas) for a class
   * FIXED: Use SQL aggregate instead of fetching 10k rows
   */
  async getRekapKas(startDate?: Date, endDate?: Date): Promise<RekapKasData> {
    // Generate cache key (without classId - all classes)
    const cacheKeyParts = ["all", startDate?.toISOString(), endDate?.toISOString()]
      .filter((p) => p)
      .join(":");
    const cacheKey = `rekap-kas:${cacheKeyParts}`;

    // Try to get from cache
    const cached = await this.cacheService.getCached<RekapKasData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Build where clause for date filtering
      const where: Prisma.TransactionWhereInput = {};
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = startDate;
        if (endDate) where.date.lte = endDate;
      }

      // Use SQL aggregation instead of fetching all rows
      const [incomeAgg, expenseAgg, count] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ...where, type: "income" },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { ...where, type: "expense" },
          _sum: { amount: true },
        }),
        prisma.transaction.count({ where }),
      ]);

      // Prisma aggregates return Decimal, convert to number for API
      const totalIncome = Number(incomeAgg._sum.amount || 0);
      const totalExpense = Number(expenseAgg._sum.amount || 0);

      const rekapData: RekapKasData = {
        totalIncome,
        totalExpense,
        totalBalance: totalIncome - totalExpense,
        transactionCount: count,
      };

      // Cache the result
      await this.cacheService.setCached(cacheKey, rekapData, 600); // 10 minutes cache

      return rekapData;
    } catch (error) {
      logger.error("Failed to fetch rekap kas:", error);
      throw error;
    }
  }

  /**
   * Get all students in all classes
   */
  async getStudents(): Promise<User[]> {
    // Try to get from cache
    const cacheKey = `all-students`;
    const cached = await this.cacheService.getCached<User[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const students = await this.userRepository.findAll({
        page: 1,
        limit: 10000, // Get all students across all classes
      });

      // Cache the result
      await this.cacheService.setCached(cacheKey, students.data, 600); // 10 minutes cache

      return students.data;
    } catch (error) {
      logger.error("Failed to fetch students:", error);
      throw error;
    }
  }

  /**
   * Invalidate bendahara-related caches
   */
  private async invalidateBendaharaCaches(): Promise<void> {
    await this.cacheService.invalidateCache(`bendahara-dashboard:all*`);
    await this.cacheService.invalidateCache(`bendahara-bills:all*`);
    await this.cacheService.invalidateCache(`rekap-kas:all*`);
    await this.cacheService.invalidateCache(`all-students*`);
  }

  /**
   * Create manual transaction
   */
  async createManualTransaction(data: {
    date: Date;
    description: string;
    type: "income" | "expense";
    amount: number;
    category?: string;
    attachment?: string;
    createdBy: string;
    classId: string;
  }) {
    try {
      // Map category to TransactionCategory enum
      const transactionCategory: TransactionCategory = data.category
        ? this.mapCategoryStringToEnum(data.category)
        : "other";

      // Create transaction (note: attachment not stored in Transaction model)
      const transaction = await this.transactionRepository.create({
        date: data.date,
        description: data.description,
        type: data.type,
        amount: data.amount,
        category: transactionCategory,
        class: {
          connect: { id: data.classId },
        },
      });

      // Invalidate caches
      await this.invalidateBendaharaCaches();

      logger.info(`Manual transaction created: ${transaction.id} by bendahara ${data.createdBy}`);

      return transaction;
    } catch (error) {
      logger.error("Failed to create manual transaction:", error);
      throw error;
    }
  }

  /**
   * Map category string to TransactionCategory enum
   */
  private mapCategoryStringToEnum(category: string): TransactionCategory {
    const categoryMap: Record<string, TransactionCategory> = {
      kas_kelas: "kas_kelas",
      donation: "donation",
      fundraising: "fundraising",
      office_supplies: "office_supplies",
      consumption: "consumption",
      event: "event",
      maintenance: "maintenance",
      other: "other",
    };

    return categoryMap[category.toLowerCase()] || "other";
  }

  /**
   * Map fund category to transaction category
   */
  private mapFundCategoryToTransactionCategory(fundCategory: string): TransactionCategory {
    const categoryMap: Record<string, TransactionCategory> = {
      education: "office_supplies",
      health: "other",
      emergency: "other",
      equipment: "office_supplies",
    };

    return categoryMap[fundCategory] || "other";
  }
}

export const bendaharaService = new BendaharaService();
