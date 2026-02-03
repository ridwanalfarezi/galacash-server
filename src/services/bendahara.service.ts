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
  pendingFundApplications: number;
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
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  students: Array<{
    userId: string;
    name: string;
    nim: string;
    totalPaid: number;
    totalUnpaid: number;
    paymentStatus: "up-to-date" | "has-arrears";
    bills: Array<{
      month: number;
      year: number;
      status: string;
      amount: number;
    }>;
  }>;
  transactions: Transaction[];
  period: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Bendahara (treasurer) service for managing class finances
 */
type StudentWithBills = {
  id: string;
  name: string;
  nim: string;
  cashBills: Array<{
    status: string;
    totalAmount: { toNumber: () => number };
    month: number;
    year: number;
  }>;
};

export class BendaharaService {
  private fundApplicationRepository = fundApplicationRepository;
  private cashBillRepository = cashBillRepository;
  private transactionRepository = transactionRepository;
  private userRepository = userRepository;
  private cacheService: CacheService;

  private readonly CACHE_TTL = {
    DASHBOARD: 60,
    BILLS: 300,
    REKAP_KAS: 300,
    STUDENTS: 600,
  };

  private readonly PAGINATION = {
    DASHBOARD_TRANSACTIONS: 5,
    DASHBOARD_ITEMS: 5,
    REKAP_TRANSACTIONS: 50,
    STUDENTS_ALL: 10000,
  };

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Get dashboard with pending applications, payments, and total balance
   */
  /**
   * Get dashboard with financial summary and recent lists
   */
  async getDashboard(classId?: string, startDate?: Date, endDate?: Date): Promise<DashboardData> {
    // Generate cache key
    const classKey = classId || "all";
    const cacheKey = `bendahara-dashboard:${classKey}:${startDate?.toISOString() || "all"}:${endDate?.toISOString() || "all"}`;
    const cached = await this.cacheService.getCached<DashboardData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const baseFilter: { classId?: string } = {};
      if (classId) {
        baseFilter.classId = classId;
      }

      const dateFilter: { date?: { gte?: Date; lte?: Date } } = {};
      if (startDate || endDate) {
        dateFilter.date = {};
        if (startDate) dateFilter.date.gte = startDate;
        if (endDate) dateFilter.date.lte = endDate;
      }

      // 1. Get Financial Summary (Income/Expense/Balance) for the period
      const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ...baseFilter, type: "income", ...dateFilter },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { ...baseFilter, type: "expense", ...dateFilter },
          _sum: { amount: true },
        }),
      ]);

      const totalIncome = Number(incomeAgg._sum.amount || 0);
      const totalExpense = Number(expenseAgg._sum.amount || 0);
      const totalBalance = totalIncome - totalExpense;

      const recentTransactions = await prisma.transaction.findMany({
        where: { ...baseFilter, ...dateFilter },
        take: this.PAGINATION.DASHBOARD_TRANSACTIONS,
        orderBy: { date: "desc" },
      });

      // 3. Get Pending Counts (Always current, not filtered by date)
      const pendingApplicationsCount = await prisma.fundApplication.count({
        where: { ...baseFilter, status: "pending" },
      });

      const pendingPaymentsCount = await prisma.cashBill.count({
        where: { ...baseFilter, status: "menunggu_konfirmasi" },
      });

      // 4. Get recent lists (Fund Apps & Bills) - Unaffected by date filter usually
      const recentFundApplications = await prisma.fundApplication.findMany({
        where: { ...baseFilter, status: "pending" },
        take: this.PAGINATION.DASHBOARD_ITEMS,
        orderBy: { createdAt: "desc" },
        include: { user: true },
      });

      const recentCashBills = await prisma.cashBill.findMany({
        where: { ...baseFilter, status: "menunggu_konfirmasi" },
        take: this.PAGINATION.DASHBOARD_ITEMS,
        orderBy: { createdAt: "desc" },
        include: { user: true },
      });

      // 5. Students count
      // For global view, we count 'user' role across the board
      const studentsCount = await prisma.user.count({
        where: { ...baseFilter, role: "user" },
      });

      const dashboardData: DashboardData = {
        pendingFundApplications: pendingApplicationsCount,
        pendingPayments: pendingPaymentsCount,
        totalBalance,
        totalIncome,
        totalExpense,
        totalStudents: studentsCount,
        recentTransactions: recentTransactions,
        recentFundApplications: recentFundApplications.map(
          (app: FundApplication & { user: User }) => ({
            ...app,
            applicant: {
              id: app.user.id,
              name: app.user.name,
            },
          })
        ) as typeof recentFundApplications & { applicant: { id: string; name: string } },
        recentCashBills: recentCashBills.map((bill: CashBill & { user: User }) => ({
          ...bill,
          name: bill.user.name,
        })) as typeof recentCashBills & { name: string },
      };

      await this.cacheService.setCached(cacheKey, dashboardData, this.CACHE_TTL.DASHBOARD);

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
      const updatedApplication = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
   * Get student detail by ID
   */
  async getStudentDetail(studentId: string) {
    return this.userRepository.findById(studentId);
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
      classId: filters?.classId,
      userId: filters?.userId,
      search: filters?.search,
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

      await this.cacheService.setCached(cacheKey, result, this.CACHE_TTL.BILLS);

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
      const updatedBill = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const bill = await tx.cashBill.findUnique({
          where: { id: billId },
          include: { user: true },
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

        if (!bill.user) {
          logger.warn(
            `User not found for bill ${billId} during confirmation. Using default description.`
          );
        }

        const monthNames = [
          "Januari",
          "Februari",
          "Maret",
          "April",
          "Mei",
          "Juni",
          "Juli",
          "Agustus",
          "September",
          "Oktober",
          "November",
          "Desember",
        ];
        const monthName = monthNames[bill.month - 1] || "Unknown";

        const description = bill.user
          ? `Kas-${monthName} ${bill.year}: ${bill.user.name}`
          : `Bill payment confirmed: ${bill.billId}`;

        // Auto-create income transaction (within same transaction)
        await tx.transaction.create({
          data: {
            class: {
              connect: { id: bill.classId },
            },
            type: "income",
            category: "kas_kelas" as TransactionCategory,
            description: description,
            amount: bill.totalAmount,
            date: new Date(),
            attachmentUrl: bill.paymentProofUrl,
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
   * Calculate student billing summary
   */
  private calculateStudentSummary(student: StudentWithBills) {
    let totalPaid = 0;
    let totalUnpaid = 0;

    const bills = student.cashBills.map((bill) => ({
      month: bill.month,
      year: bill.year,
      status: bill.status,
      amount: Number(bill.totalAmount),
    }));

    student.cashBills.forEach((bill) => {
      if (bill.status === "sudah_dibayar") {
        totalPaid += Number(bill.totalAmount);
      } else {
        totalUnpaid += Number(bill.totalAmount);
      }
    });

    return {
      userId: student.id,
      name: student.name,
      nim: student.nim,
      totalPaid,
      totalUnpaid,
      paymentStatus: (totalUnpaid === 0 ? "up-to-date" : "has-arrears") as
        | "up-to-date"
        | "has-arrears",
      bills,
    };
  }

  /**
   * Get financial summary (rekap kas) for a class
   * Includes student billing summary and transaction history
   */
  async getRekapKas(
    classId: string | undefined,
    params: {
      startDate?: Date;
      endDate?: Date;
      search?: string;
      page?: number;
      limit?: number;
      paymentStatus?: "up-to-date" | "has-arrears";
    }
  ): Promise<
    RekapKasData & {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  > {
    const { startDate, endDate, search, page = 1, limit = 10, paymentStatus } = params;

    // Use current month/year if no date range provided
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), 0, 1); // Default to start of year
    const end = endDate || new Date(now.getFullYear(), 11, 31); // Default to end of year

    // Generate cache key
    const cacheKey = `rekap-kas:${classId || "all"}:${start.toISOString()}:${end.toISOString()}:${search || ""}:${page}:${limit}:${paymentStatus || ""}`;

    // Try to get from cache
    const cached = await this.cacheService.getCached<
      RekapKasData & {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
    >(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // 1. Get Financial Summary for the class
      const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: { classId, type: "income", date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { classId, type: "expense", date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);

      const totalIncome = Number(incomeAgg._sum.amount || 0);
      const totalExpense = Number(expenseAgg._sum.amount || 0);

      const whereClause: Prisma.UserWhereInput = {
        classId,
        role: "user",
      };

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { nim: { contains: search, mode: "insensitive" } },
        ];
      }

      if (paymentStatus === "has-arrears") {
        whereClause.cashBills = {
          some: {
            status: { not: "sudah_dibayar" },
          },
        };
      } else if (paymentStatus === "up-to-date") {
        whereClause.NOT = {
          cashBills: {
            some: {
              status: { not: "sudah_dibayar" },
            },
          },
        };
      }

      // 3. Get total count for pagination
      const totalStudents = await prisma.user.count({ where: whereClause });

      // 4. Get Students with their billing status
      const students = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          nim: true,
          cashBills: {
            select: {
              status: true,
              totalAmount: true,
              month: true,
              year: true,
            },
          },
        },
        orderBy: { nim: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      });

      const studentSummaries = students.map((s: StudentWithBills) =>
        this.calculateStudentSummary(s)
      );

      const transactions = await prisma.transaction.findMany({
        where: { classId, date: { gte: start, lte: end } },
        orderBy: { date: "desc" },
        take: this.PAGINATION.REKAP_TRANSACTIONS,
      });

      const rekapData = {
        summary: {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
        },
        students: studentSummaries,
        transactions,
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        total: totalStudents,
        page,
        limit,
        totalPages: Math.ceil(totalStudents / limit),
      };

      await this.cacheService.setCached(cacheKey, rekapData, this.CACHE_TTL.REKAP_KAS);

      return rekapData;
    } catch (error) {
      logger.error("Failed to fetch rekap kas:", error);
      throw error;
    }
  }

  /**
   * Get all students in all classes
   */
  async getStudents(): Promise<Omit<User, "password">[]> {
    // Try to get from cache
    const cacheKey = `all-students`;
    const cached = await this.cacheService.getCached<Omit<User, "password">[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const students = await this.userRepository.findAll({
        page: 1,
        limit: this.PAGINATION.STUDENTS_ALL,
      });

      const safeStudents = students.data.map((user) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...safeUser } = user;
        return safeUser;
      });

      await this.cacheService.setCached(cacheKey, safeStudents, this.CACHE_TTL.STUDENTS);

      return safeStudents;
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
    await this.cacheService.invalidateTransactions("all");
    await this.cacheService.invalidateCache("chart-data*");
    await this.cacheService.invalidateCache("breakdown*");
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

      // Create transaction
      const transaction = await this.transactionRepository.create({
        date: data.date,
        description: data.description,
        type: data.type,
        amount: data.amount,
        category: transactionCategory,
        attachmentUrl: data.attachment,
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
      education: "education",
      health: "health",
      emergency: "emergency",
      equipment: "equipment",
      fine: "fine",
      printing: "printing",
      transport: "transport",
      social: "social",
      other: "other",
    };

    return categoryMap[category.toLowerCase()] || "other";
  }

  /**
   * Map fund category to transaction category
   */
  private mapFundCategoryToTransactionCategory(fundCategory: string): TransactionCategory {
    const categoryMap: Record<string, TransactionCategory> = {
      education: "education",
      health: "health",
      emergency: "emergency",
      equipment: "equipment",
    };

    return categoryMap[fundCategory] || "other";
  }
}

export const bendaharaService = new BendaharaService();
