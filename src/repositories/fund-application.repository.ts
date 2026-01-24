import { FundApplication, FundCategory, FundStatus, Prisma } from "@/prisma/generated/client";
import { AppError, DatabaseError, NotFoundError } from "@/utils/errors";
import { prisma } from "@/utils/prisma-client";

export interface FundApplicationFilters {
  classId?: string;
  userId?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "amount" | "status";
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class FundApplicationRepository {
  /**
   * Find fund application by ID
   */
  async findById(id: string): Promise<FundApplication | null> {
    try {
      return await prisma.fundApplication.findUnique({
        where: { id },
        include: {
          user: true,
          reviewer: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch fund application");
      }
      throw error;
    }
  }

  /**
   * Find all fund applications with filters and pagination
   */
  async findAll(
    filters: Partial<FundApplicationFilters>
  ): Promise<PaginatedResponse<FundApplication>> {
    const {
      classId,
      userId,
      status,
      category,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
    } = filters;

    try {
      const where: Prisma.FundApplicationWhereInput = {};

      if (classId) {
        where.classId = classId;
      }

      if (userId) {
        where.userId = userId;
      }

      if (status) {
        where.status = status as FundStatus;
      }

      if (category) {
        where.category = category as FundCategory;
      }
      if (search) {
        where.OR = [
          { purpose: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.fundApplication.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            user: true,
            reviewer: true,
          },
        }),
        prisma.fundApplication.count({ where }),
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
        throw new DatabaseError("Failed to fetch fund applications");
      }
      throw error;
    }
  }

  /**
   * Find all fund applications by user ID
   */
  async findByUserId(
    userId: string,
    filters?: Partial<FundApplicationFilters>
  ): Promise<PaginatedResponse<FundApplication>> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      category,
      search,
    } = filters || {};

    try {
      const where: Prisma.FundApplicationWhereInput = {
        userId,
      };

      if (status) {
        where.status = status as FundStatus;
      }

      if (category) {
        where.category = category as FundCategory;
      }
      if (search) {
        where.OR = [
          { purpose: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.fundApplication.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            user: true,
            reviewer: true,
          },
        }),
        prisma.fundApplication.count({ where }),
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
        throw new DatabaseError("Failed to fetch user fund applications");
      }
      throw error;
    }
  }

  /**
   * Create new fund application
   */
  async create(data: Prisma.FundApplicationCreateInput): Promise<FundApplication> {
    try {
      return await prisma.fundApplication.create({
        data,
        include: {
          user: true,
          reviewer: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to create fund application");
      }
      throw error;
    }
  }

  /**
   * Update fund application
   */
  async update(id: string, data: Prisma.FundApplicationUpdateInput): Promise<FundApplication> {
    try {
      const application = await prisma.fundApplication.findUnique({
        where: { id },
      });

      if (!application) {
        throw new NotFoundError("Fund application not found", "FundApplication");
      }

      return await prisma.fundApplication.update({
        where: { id },
        data,
        include: {
          user: true,
          reviewer: true,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to update fund application");
      }
      throw error;
    }
  }

  /**
   * Update fund application status
   */
  async updateStatus(
    id: string,
    status: string,
    reviewedBy: string,
    rejectionReason?: string
  ): Promise<FundApplication> {
    try {
      const application = await prisma.fundApplication.findUnique({
        where: { id },
      });

      if (!application) {
        throw new NotFoundError("Fund application not found", "FundApplication");
      }

      const updateData: Prisma.FundApplicationUpdateInput = {
        status: status as FundStatus,
        reviewer: {
          connect: { id: reviewedBy },
        },
        reviewedAt: new Date(),
      };

      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      return await prisma.fundApplication.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
          reviewer: true,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to update fund application status");
      }
      throw error;
    }
  }

  /**
   * Count fund applications by status (efficient - no data fetch)
   */
  async countByStatus(status: FundStatus): Promise<number> {
    try {
      return await prisma.fundApplication.count({
        where: { status },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to count fund applications");
      }
      throw error;
    }
  }
}

export const fundApplicationRepository = new FundApplicationRepository();
