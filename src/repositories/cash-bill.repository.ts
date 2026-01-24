import { BillStatus, CashBill, PaymentMethod, Prisma } from "@/prisma/generated/client";
import { AppError, DatabaseError, NotFoundError } from "@/utils/errors";
import { prisma } from "@/utils/prisma-client";

export interface CashBillFilters {
  classId?: string;
  userId?: string;
  status?: string;
  statuses?: string[]; // Support array of statuses for efficient queries
  month?: number; // Changed to number (1-12)
  year?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string; // Search by billId
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CashBillRepository {
  /**
   * Find cash bill by ID
   */
  async findById(id: string): Promise<CashBill | null> {
    try {
      return await prisma.cashBill.findUnique({
        where: { id },
        include: {
          user: true,
          class: true,
          confirmer: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch cash bill");
      }
      throw error;
    }
  }

  /**
   * Find all cash bills with filters and pagination
   */
  async findAll(filters: CashBillFilters = {}): Promise<PaginatedResponse<CashBill>> {
    const {
      classId,
      userId,
      status,
      statuses,
      month,
      year,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = filters;

    try {
      const where: Prisma.CashBillWhereInput = {};

      if (classId) {
        where.classId = classId;
      }

      if (userId) {
        where.userId = userId;
      }

      // Support both single status and array of statuses
      if (statuses && statuses.length > 0) {
        where.status = { in: statuses as BillStatus[] };
      } else if (status) {
        where.status = status as BillStatus;
      }

      if (month) {
        where.month = month;
      }

      if (year) {
        where.year = year;
      }

      const skip = (page - 1) * limit;

      // Map sortBy to valid field names
      const orderByField =
        sortBy === "dueDate" ? "dueDate" : sortBy === "month" ? "month" : "createdAt";

      const [data, total] = await Promise.all([
        prisma.cashBill.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [orderByField]: sortOrder },
          include: {
            user: {
              select: {
                id: true,
                nim: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                classId: true,
              },
            },
            class: true,
            confirmer: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        }),
        prisma.cashBill.count({ where }),
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
        throw new DatabaseError("Failed to fetch cash bills");
      }
      throw error;
    }
  }

  /**
   * Find cash bills by user ID with optional filters
   */
  async findByUserId(
    userId: string,
    filters?: Partial<CashBillFilters>
  ): Promise<PaginatedResponse<CashBill>> {
    const {
      status,
      statuses,
      month,
      year,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
    } = filters || {};

    try {
      const where: Prisma.CashBillWhereInput = {
        userId,
      };

      // Support both single status and array of statuses
      if (statuses && statuses.length > 0) {
        where.status = { in: statuses as BillStatus[] };
      } else if (status) {
        where.status = status as BillStatus;
      }

      if (month) {
        where.month = month;
      }

      if (year) {
        where.year = year;
      }

      // Search by billId (case-insensitive contains)
      if (search) {
        where.billId = { contains: search, mode: "insensitive" };
      }

      const skip = (page - 1) * limit;

      // Map sortBy to valid field names
      const orderByField =
        sortBy === "dueDate" ? "dueDate" : sortBy === "month" ? "month" : "createdAt";

      const [data, total] = await Promise.all([
        prisma.cashBill.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [orderByField]: sortOrder },
          include: {
            user: {
              select: {
                id: true,
                nim: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                classId: true,
              },
            },
            class: true,
            confirmer: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        }),
        prisma.cashBill.count({ where }),
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
        throw new DatabaseError("Failed to fetch user cash bills");
      }
      throw error;
    }
  }

  /**
   * Create new cash bill
   */
  async create(data: Prisma.CashBillCreateInput): Promise<CashBill> {
    try {
      return await prisma.cashBill.create({
        data,
        include: {
          user: true,
          class: true,
          confirmer: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to create cash bill");
      }
      throw error;
    }
  }

  /**
   * Update cash bill
   */
  async update(id: string, data: Prisma.CashBillUpdateInput): Promise<CashBill> {
    try {
      const bill = await prisma.cashBill.findUnique({
        where: { id },
      });

      if (!bill) {
        throw new NotFoundError("Cash bill not found", "CashBill");
      }

      return await prisma.cashBill.update({
        where: { id },
        data,
        include: {
          user: true,
          class: true,
          confirmer: true,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to update cash bill");
      }
      throw error;
    }
  }

  /**
   * Update payment status of cash bill
   */
  async updatePaymentStatus(
    id: string,
    status: string,
    data?: Partial<{
      paymentMethod: string;
      paymentProofUrl: string;
      confirmedBy: string;
    }>
  ): Promise<CashBill> {
    try {
      const bill = await prisma.cashBill.findUnique({
        where: { id },
      });

      if (!bill) {
        throw new NotFoundError("Cash bill not found", "CashBill");
      }

      const updateData: Prisma.CashBillUpdateInput = {
        status: status as BillStatus,
      };

      if (data?.paymentMethod) {
        updateData.paymentMethod = data.paymentMethod as PaymentMethod;
      }

      if (data?.paymentProofUrl) {
        updateData.paymentProofUrl = data.paymentProofUrl;
      }

      if (status === "sudah_dibayar") {
        updateData.paidAt = new Date();
      }

      if (data?.confirmedBy) {
        updateData.confirmer = {
          connect: { id: data.confirmedBy },
        };
        updateData.confirmedAt = new Date();
      }

      return await prisma.cashBill.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
          class: true,
          confirmer: true,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to update payment status");
      }
      throw error;
    }
  }

  /**
   * Find cash bill by user and month/year
   */
  async findByUserAndMonth(userId: string, month: number, year: number): Promise<CashBill | null> {
    try {
      return await prisma.cashBill.findUnique({
        where: {
          userId_month_year: {
            userId,
            month,
            year,
          },
        },
        include: {
          user: true,
          class: true,
          confirmer: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch cash bill");
      }
      throw error;
    }
  }

  /**
   * Count cash bills by status (efficient - no data fetch)
   */
  async countByStatus(status: BillStatus): Promise<number> {
    try {
      return await prisma.cashBill.count({
        where: { status },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to count cash bills");
      }
      throw error;
    }
  }
}

export const cashBillRepository = new CashBillRepository();
