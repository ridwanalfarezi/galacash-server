import {
  CashBillFilters,
  cashBillRepository,
  PaginatedResponse,
} from "@/repositories/cash-bill.repository";
import { AuthorizationError, BusinessLogicError, NotFoundError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { CacheService } from "./cache.service";

export interface PayBillData {
  paymentMethod: "bank" | "ewallet" | "cash";
  paymentProofUrl: string;
}

/**
 * Cash bill service for handling student bill payments
 */
export class CashBillService {
  private cashBillRepository = cashBillRepository;
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Get user's bills with pagination and caching
   */
  async getMyBills(
    userId: string,
    filters?: Partial<CashBillFilters>
  ): Promise<PaginatedResponse<any>> {
    const mergedFilters: CashBillFilters = {
      userId,
      page: filters?.page || 1,
      limit: filters?.limit || 20,
      status: filters?.status,
      month: filters?.month,
      year: filters?.year,
    };

    // Generate cache key
    const filterString = JSON.stringify(mergedFilters);
    const cacheKey = `my-bills:${userId}:${filterString}`;

    // Try to get from cache
    const cached = await this.cacheService.getCached<PaginatedResponse<any>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch from repository
      const result = await this.cashBillRepository.findByUserId(userId, mergedFilters);

      // Cache the result
      await this.cacheService.setCached(cacheKey, result, 300); // 5 minutes cache

      return result;
    } catch (error) {
      logger.error("Failed to fetch user bills:", error);
      throw error;
    }
  }

  // Compatibility alias for controllers
  async getByUser(userId: string, filters?: Partial<CashBillFilters>) {
    return this.getMyBills(userId, filters);
  }

  // Compatibility alias: allows optional ownership check
  async getById(id: string, userId?: string) {
    if (userId) {
      return this.getBillById(id, userId);
    }
    const bill = await this.cashBillRepository.findById(id);
    if (!bill) {
      throw new NotFoundError("Cash bill not found", "CashBill");
    }
    return bill;
  }

  /**
   * Get bill by ID with authorization check
   */
  async getBillById(id: string, userId: string): Promise<any> {
    // Try to get from cache
    const cacheKey = this.cacheService.cashBillKey(id);
    const cached = await this.cacheService.getCached<any>(cacheKey);
    if (cached) {
      // Authorization check for cached result
      this.checkOwnership(cached, userId);
      return cached;
    }

    try {
      const bill = await this.cashBillRepository.findById(id);

      if (!bill) {
        throw new NotFoundError("Cash bill not found", "CashBill");
      }

      // Authorization check - bill must belong to user
      this.checkOwnership(bill, userId);

      // Cache the result
      await this.cacheService.setCached(cacheKey, bill, 300); // 5 minutes cache

      return bill;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      logger.error("Failed to fetch bill:", error);
      throw error;
    }
  }

  /**
   * Submit payment for a bill
   */
  async payBill(
    billId: string,
    userId: string,
    paymentMethod: "bank" | "ewallet" | "cash",
    paymentProofUrl: string
  ): Promise<any> {
    try {
      // Get bill and verify ownership
      const bill = await this.cashBillRepository.findById(billId);

      if (!bill) {
        throw new NotFoundError("Cash bill not found", "CashBill");
      }

      // Check ownership
      if (bill.userId !== userId) {
        throw new AuthorizationError("This bill does not belong to you");
      }

      // Check if bill is already paid or already submitted for payment
      if (bill.status !== "belum_dibayar") {
        throw new BusinessLogicError(
          `Cannot pay bill with status '${bill.status}'. Only bills with 'belum_dibayar' status can be paid.`
        );
      }

      // Update bill status to menunggu_konfirmasi and store payment proof
      const updatedBill = await this.cashBillRepository.update(billId, {
        status: "menunggu_konfirmasi",
        paymentMethod: paymentMethod as any,
        paymentProofUrl,
        paidAt: new Date(),
      });

      // Invalidate caches
      await this.invalidateBillCache(userId, bill.classId);

      logger.info(
        `Bill payment submitted: ${billId} by user ${userId} with method ${paymentMethod}`
      );

      return updatedBill;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError ||
        error instanceof BusinessLogicError
      ) {
        throw error;
      }
      logger.error("Failed to submit bill payment:", error);
      throw error;
    }
  }

  // Compatibility alias for controller expectation
  async pay(
    billId: string,
    userId: string,
    data: { paymentMethod: "bank" | "ewallet" | "cash"; paymentProofUrl: string }
  ) {
    return this.payBill(billId, userId, data.paymentMethod, data.paymentProofUrl);
  }

  /**
   * Cancel payment for a bill
   */
  async cancelPayment(billId: string, userId: string): Promise<any> {
    try {
      // Get bill and verify ownership
      const bill = await this.cashBillRepository.findById(billId);

      if (!bill) {
        throw new NotFoundError("Cash bill not found", "CashBill");
      }

      // Check ownership
      if (bill.userId !== userId) {
        throw new AuthorizationError("This bill does not belong to you");
      }

      // Check if payment is pending (menunggu_konfirmasi)
      if (bill.status !== "menunggu_konfirmasi") {
        throw new BusinessLogicError(
          `Cannot cancel payment for bill with status '${bill.status}'. Only payments waiting for confirmation can be cancelled.`
        );
      }

      // Revert bill to belum_dibayar and clear payment info
      const updatedBill = await this.cashBillRepository.update(billId, {
        status: "belum_dibayar",
        paymentMethod: null,
        paymentProofUrl: null,
        paidAt: null,
      });

      // Invalidate caches
      await this.invalidateBillCache(userId, bill.classId);

      logger.info(`Bill payment cancelled: ${billId} by user ${userId}`);

      return updatedBill;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError ||
        error instanceof BusinessLogicError
      ) {
        throw error;
      }
      logger.error("Failed to cancel bill payment:", error);
      throw error;
    }
  }

  async getPendingByUser(userId: string) {
    return this.cashBillRepository.findByUserId(userId, {
      userId,
      status: "menunggu_konfirmasi",
      page: 1,
      limit: 50,
    });
  }

  /**
   * Check if bill belongs to user
   */
  private checkOwnership(bill: any, userId: string): void {
    if (bill.userId !== userId) {
      throw new AuthorizationError("This bill does not belong to you");
    }
  }

  /**
   * Invalidate bill-related caches
   */
  private async invalidateBillCache(userId: string, classId: string): Promise<void> {
    await this.cacheService.invalidateCache(`my-bills:${userId}*`);
    await this.cacheService.invalidateCache(`class-bills:${classId}*`);
  }
}

export const cashBillService = new CashBillService();
