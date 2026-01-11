import {
  PaymentAccountFilters,
  paymentAccountRepository,
} from "@/repositories/payment-account.repository";
import { NotFoundError, ValidationError } from "@/utils/errors";
import { AccountStatus, AccountType, PaymentAccount } from "@prisma/client";

export interface CreatePaymentAccountDto {
  name: string;
  accountType: AccountType;
  accountNumber?: string;
  accountHolder?: string;
  description?: string;
}

export interface UpdatePaymentAccountDto {
  name?: string;
  accountNumber?: string;
  accountHolder?: string;
  description?: string;
  status?: AccountStatus;
}

export class PaymentAccountService {
  /**
   * Get all payment accounts with optional filtering
   */
  async getAll(filters?: PaymentAccountFilters): Promise<PaymentAccount[]> {
    return await paymentAccountRepository.findAll(filters);
  }

  /**
   * Get active payment accounts (for users to see available payment options)
   */
  async getActive(): Promise<PaymentAccount[]> {
    return await paymentAccountRepository.findActive();
  }

  /**
   * Get payment account by ID
   */
  async getById(id: string): Promise<PaymentAccount> {
    const account = await paymentAccountRepository.findById(id);

    if (!account) {
      throw new NotFoundError("Payment account not found");
    }

    return account;
  }

  /**
   * Create new payment account (bendahara only)
   */
  async create(data: CreatePaymentAccountDto): Promise<PaymentAccount> {
    // Validate required fields
    if (!data.name || !data.accountType) {
      throw new ValidationError("Name and account type are required");
    }

    return await paymentAccountRepository.create({
      name: data.name,
      accountType: data.accountType,
      accountNumber: data.accountNumber,
      accountHolder: data.accountHolder,
      description: data.description,
      status: "active",
    });
  }

  /**
   * Update payment account (bendahara only)
   */
  async update(id: string, data: UpdatePaymentAccountDto): Promise<PaymentAccount> {
    // Check if account exists
    await this.getById(id);

    return await paymentAccountRepository.update(id, data);
  }

  /**
   * Delete payment account (bendahara only)
   */
  async delete(id: string): Promise<void> {
    // Check if account exists
    await this.getById(id);

    // Check if account is being used by any cash bills
    const usageCount = await this.checkUsage(id);
    if (usageCount > 0) {
      throw new ValidationError(
        `Cannot delete payment account. It is currently used by ${usageCount} cash bill(s). Consider deactivating instead.`
      );
    }

    await paymentAccountRepository.delete(id);
  }

  /**
   * Activate payment account
   */
  async activate(id: string): Promise<PaymentAccount> {
    return await this.update(id, { status: "active" });
  }

  /**
   * Deactivate payment account
   */
  async deactivate(id: string): Promise<PaymentAccount> {
    return await this.update(id, { status: "inactive" });
  }

  /**
   * Check how many cash bills are using this payment account
   */
  private async checkUsage(id: string): Promise<number> {
    const { prisma } = await import("@/utils/prisma-client");
    return await prisma.cashBill.count({
      where: { paymentAccountId: id },
    });
  }
}

export const paymentAccountService = new PaymentAccountService();
