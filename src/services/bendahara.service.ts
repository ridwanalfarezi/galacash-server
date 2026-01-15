import { CashBill, FundApplication, TransactionCategory, User } from "@/prisma/generated/client";
import {
  PaginatedResponse as BillPaginatedResponse,
  CashBillFilters,
  cashBillRepository,
} from "@/repositories/cash-bill.repository";
import {
  FundApplicationFilters,
  fundApplicationRepository,
  PaginatedResponse as FundPaginatedResponse,
} from "@/repositories/fund-application.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { userRepository } from "@/repositories/user.repository";
import { BusinessLogicError, NotFoundError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { CacheService } from "./cache.service";

export interface DashboardData {
  pendingApplications: number;
  pendingPayments: number;
  totalBalance: number;
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
  async getDashboard(classId: string): Promise<DashboardData> {
    // Check cache first
    const cacheKey = `bendahara-dashboard:${classId}`;
    const cached = await this.cacheService.getCached<DashboardData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get pending applications count
      const pendingApplications = await this.fundApplicationRepository.findAll({
        classId,
        status: "pending",
        page: 1,
        limit: 1,
      });

      // Get pending payments count
      const pendingPayments = await this.cashBillRepository.findAll({
        classId,
        status: "menunggu_konfirmasi",
        page: 1,
        limit: 1,
      });

      // Get total balance
      const balance = await this.transactionRepository.getBalance(classId);

      const dashboardData: DashboardData = {
        pendingApplications: pendingApplications.total,
        pendingPayments: pendingPayments.total,
        totalBalance: balance.balance,
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
   * Get all fund applications for review
   */
  async getAllFundApplications(
    classId: string,
    filters?: Partial<FundApplicationFilters>
  ): Promise<FundPaginatedResponse<FundApplication>> {
    const mergedFilters: FundApplicationFilters = {
      classId,
      page: filters?.page || 1,
      limit: filters?.limit || 20,
      status: filters?.status,
      category: filters?.category,
      sortBy: filters?.sortBy || "createdAt",
      sortOrder: filters?.sortOrder || "desc",
    };

    // Generate cache key
    const filterString = JSON.stringify(mergedFilters);
    const cacheKey = `bendahara-applications:${classId}:${filterString}`;

    // Try to get from cache
    const cached =
      await this.cacheService.getCached<FundPaginatedResponse<FundApplication>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.fundApplicationRepository.findAll(mergedFilters);

      // Cache the result
      await this.cacheService.setCached(cacheKey, result, 300); // 5 minutes cache

      return result;
    } catch (error) {
      logger.error("Failed to fetch fund applications for bendahara:", error);
      throw error;
    }
  }

  /**
   * Approve fund application and auto-create expense transaction
   */
  async approveFundApplication(
    applicationId: string,
    bendaharaId: string
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
          `Cannot approve application with status '${application.status}'. Only pending applications can be approved.`
        );
      }

      // Update application status
      const updatedApplication = await this.fundApplicationRepository.update(applicationId, {
        status: "approved",
        reviewer: {
          connect: { id: bendaharaId },
        },
        reviewedAt: new Date(),
      });

      // Auto-create expense transaction
      await this.transactionRepository.create({
        class: {
          connect: { id: application.classId },
        },
        type: "expense",
        category: this.mapFundCategoryToTransactionCategory(application.category),
        description: `Fund approval: ${application.purpose}`,
        amount: application.amount,
        date: new Date(),
      });

      // Invalidate caches
      await this.invalidateBendaharaCaches(application.classId);

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
      await this.invalidateBendaharaCaches(application.classId);

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
   * Get all cash bills for a class
   */
  async getAllCashBills(
    classId: string,
    filters?: Partial<CashBillFilters>
  ): Promise<BillPaginatedResponse<CashBill>> {
    const mergedFilters: CashBillFilters = {
      classId,
      page: filters?.page || 1,
      limit: filters?.limit || 20,
      status: filters?.status,
      month: filters?.month,
      year: filters?.year,
    };

    // Generate cache key
    const filterString = JSON.stringify(mergedFilters);
    const cacheKey = `bendahara-bills:${classId}:${filterString}`;

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
   */
  async confirmPayment(billId: string, bendaharaId: string): Promise<CashBill> {
    try {
      // Get the bill
      const bill = await this.cashBillRepository.findById(billId);

      if (!bill) {
        throw new NotFoundError("Cash bill not found", "CashBill");
      }

      // Check if payment is waiting for confirmation
      if (bill.status !== "menunggu_konfirmasi") {
        throw new BusinessLogicError(
          `Cannot confirm bill with status '${bill.status}'. Only bills waiting for confirmation can be confirmed.`
        );
      }

      // Update bill status to sudah_dibayar
      const updatedBill = await this.cashBillRepository.updatePaymentStatus(
        billId,
        "sudah_dibayar",
        {
          confirmedBy: bendaharaId,
        }
      );

      // Auto-create income transaction
      await this.transactionRepository.create({
        class: {
          connect: { id: bill.classId },
        },
        type: "income",
        category: "kas_kelas" as TransactionCategory,
        description: `Bill payment confirmed: ${bill.billId}`,
        amount: bill.totalAmount,
        date: new Date(),
      });

      // Invalidate caches
      await this.invalidateBendaharaCaches(bill.classId);

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
      await this.invalidateBendaharaCaches(bill.classId);

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
   */
  async getRekapKas(classId: string, startDate?: Date, endDate?: Date): Promise<RekapKasData> {
    // Generate cache key
    const cacheKeyParts = [classId, startDate?.toISOString(), endDate?.toISOString()]
      .filter((p) => p)
      .join(":");
    const cacheKey = `rekap-kas:${cacheKeyParts}`;

    // Try to get from cache
    const cached = await this.cacheService.getCached<RekapKasData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get transactions with filters
      const transactions = await this.transactionRepository.findAll({
        classId,
        startDate,
        endDate,
        page: 1,
        limit: 1000, // Get all transactions for summary
      });

      // Calculate totals
      let totalIncome = 0;
      let totalExpense = 0;

      transactions.data.forEach((transaction) => {
        if (transaction.type === "income") {
          totalIncome += transaction.amount;
        } else {
          totalExpense += transaction.amount;
        }
      });

      const rekapData: RekapKasData = {
        totalIncome,
        totalExpense,
        totalBalance: totalIncome - totalExpense,
        transactionCount: transactions.total,
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
   * Get all students in a class
   */
  async getStudents(classId: string): Promise<User[]> {
    // Try to get from cache
    const cacheKey = `class-students:${classId}`;
    const cached = await this.cacheService.getCached<User[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const students = await this.userRepository.findAll({
        classId,
        page: 1,
        limit: 1000, // Get all students in class
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
  private async invalidateBendaharaCaches(classId: string): Promise<void> {
    await this.cacheService.invalidateCache(`bendahara-dashboard:${classId}*`);
    await this.cacheService.invalidateCache(`bendahara-applications:${classId}*`);
    await this.cacheService.invalidateCache(`bendahara-bills:${classId}*`);
    await this.cacheService.invalidateCache(`rekap-kas:${classId}*`);
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
      await this.invalidateBendaharaCaches(data.classId);

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
