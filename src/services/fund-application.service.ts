import { FundApplication, FundCategory, Prisma } from "@/prisma/generated/client";
import {
  FundApplicationFilters,
  fundApplicationRepository,
  PaginatedResponse,
} from "@/repositories/fund-application.repository";
import { AuthorizationError, NotFoundError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { CacheService } from "./cache.service";

export interface CreateFundApplicationData {
  purpose: string;
  description: string;
  category: string;
  amount: number;
  attachmentUrl?: string;
}

/**
 * Fund application service for handling fund application operations
 */
export class FundApplicationService {
  private fundApplicationRepository = fundApplicationRepository;
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Get all fund applications for a class with caching
   */
  async getAll(
    classId: string,
    filters?: Partial<FundApplicationFilters>
  ): Promise<PaginatedResponse<FundApplication>> {
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
    const cacheKey = this.cacheService.fundApplicationsKey(filterString);

    // Try to get from cache
    const cached = await this.cacheService.getCached<PaginatedResponse<FundApplication>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch from repository
      const result = await this.fundApplicationRepository.findAll(mergedFilters);

      // Cache the result
      await this.cacheService.setCached(cacheKey, result, 300); // 5 minutes cache

      return result;
    } catch (error) {
      logger.error("Failed to fetch fund applications:", error);
      throw error;
    }
  }

  /**
   * Get user's own fund applications only
   */
  async getMyApplications(
    userId: string,
    filters?: Partial<FundApplicationFilters>
  ): Promise<PaginatedResponse<FundApplication>> {
    const mergedFilters: Partial<FundApplicationFilters> = {
      page: filters?.page || 1,
      limit: filters?.limit || 20,
      status: filters?.status,
      category: filters?.category,
      sortBy: filters?.sortBy || "createdAt",
      sortOrder: filters?.sortOrder || "desc",
    };

    // Generate cache key
    const filterString = JSON.stringify(mergedFilters);
    const cacheKey = `my-applications:${userId}:${filterString}`;

    // Try to get from cache
    const cached = await this.cacheService.getCached<PaginatedResponse<FundApplication>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch from repository
      const result = await this.fundApplicationRepository.findByUserId(
        userId,
        mergedFilters as FundApplicationFilters
      );

      // Cache the result
      await this.cacheService.setCached(cacheKey, result, 300); // 5 minutes cache

      return result;
    } catch (error) {
      logger.error("Failed to fetch user fund applications:", error);
      throw error;
    }
  }

  async getPendingByUser(userId: string): Promise<PaginatedResponse<FundApplication>> {
    return this.fundApplicationRepository.findByUserId(userId, {
      page: 1,
      limit: 50,
      status: "pending",
      sortBy: "createdAt",
      sortOrder: "desc",
      category: undefined,
    });
  }

  /**
   * Get single fund application by ID with permission check
   */
  async getById(id: string, userId?: string, userRole?: string): Promise<FundApplication> {
    // Try to get from cache
    const cacheKey = this.cacheService.fundApplicationKey(id);
    const cached = await this.cacheService.getCached<FundApplication>(cacheKey);
    if (cached) {
      // Permission check for cached result
      this.checkPermission(cached, userId, userRole);
      return cached;
    }

    try {
      const application = await this.fundApplicationRepository.findById(id);

      if (!application) {
        throw new NotFoundError("Fund application not found");
      }

      // Permission check
      this.checkPermission(application, userId, userRole);

      // Cache the result
      await this.cacheService.setCached(cacheKey, application, 300); // 5 minutes cache

      return application;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      logger.error("Failed to fetch fund application:", error);
      throw error;
    }
  }

  /**
   * Create a new fund application
   */
  async create(
    userId: string,
    classId: string,
    data: CreateFundApplicationData
  ): Promise<FundApplication> {
    try {
      const createData: Prisma.FundApplicationCreateInput = {
        purpose: data.purpose,
        description: data.description,
        category: data.category as FundCategory,
        amount: data.amount,
        attachmentUrl: data.attachmentUrl,
        status: "pending",
        user: {
          connect: { id: userId },
        },
        applicant: {
          connect: { id: classId },
        },
      };

      const application = await this.fundApplicationRepository.create(createData);

      // Invalidate related caches
      await this.invalidateFundApplicationCache(classId, userId);

      logger.info(
        `Fund application created: ${application.id} by user ${userId} for class ${classId}`
      );

      return application;
    } catch (error) {
      logger.error("Failed to create fund application:", error);
      throw error;
    }
  }

  /**
   * Check if user has permission to access the application
   */
  private checkPermission(application: FundApplication, userId?: string, userRole?: string): void {
    // Admin can access everything
    if (userRole === "admin") {
      return;
    }

    // User can only access their own applications
    if (userId && application.userId !== userId) {
      throw new AuthorizationError("You do not have permission to access this fund application");
    }

    // If no userId provided and not admin, deny access
    if (!userId && userRole !== "admin") {
      throw new AuthorizationError("You do not have permission to access this fund application");
    }
  }

  /**
   * Invalidate fund application cache when application is created/updated
   */
  async invalidateFundApplicationCache(classId: string, userId: string): Promise<void> {
    await this.cacheService.invalidateCache(`fund-applications:${classId}*`);
    await this.cacheService.invalidateCache(`my-applications:${userId}*`);
  }
}

export const fundApplicationService = new FundApplicationService();
