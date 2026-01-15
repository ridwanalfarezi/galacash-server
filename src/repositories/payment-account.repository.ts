import { AccountStatus, AccountType, PaymentAccount, Prisma } from "@/prisma/generated/client";
import { prisma } from "@/utils/prisma-client";

export interface PaymentAccountFilters {
  status?: AccountStatus;
  accountType?: AccountType;
  search?: string;
}

export class PaymentAccountRepository {
  /**
   * Find all payment accounts with optional filtering
   */
  async findAll(filters?: PaymentAccountFilters): Promise<PaymentAccount[]> {
    const where: Prisma.PaymentAccountWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.accountType) {
      where.accountType = filters.accountType;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { accountHolder: { contains: filters.search, mode: "insensitive" } },
        { accountNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return await prisma.paymentAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find active payment accounts only
   */
  async findActive(): Promise<PaymentAccount[]> {
    return await prisma.paymentAccount.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Find payment account by ID
   */
  async findById(id: string): Promise<PaymentAccount | null> {
    return await prisma.paymentAccount.findUnique({
      where: { id },
    });
  }

  /**
   * Create new payment account
   */
  async create(data: Prisma.PaymentAccountCreateInput): Promise<PaymentAccount> {
    return await prisma.paymentAccount.create({
      data,
    });
  }

  /**
   * Update payment account
   */
  async update(id: string, data: Prisma.PaymentAccountUpdateInput): Promise<PaymentAccount> {
    return await prisma.paymentAccount.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete payment account
   */
  async delete(id: string): Promise<PaymentAccount> {
    return await prisma.paymentAccount.delete({
      where: { id },
    });
  }

  /**
   * Count payment accounts
   */
  async count(filters?: PaymentAccountFilters): Promise<number> {
    const where: Prisma.PaymentAccountWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.accountType) {
      where.accountType = filters.accountType;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { accountHolder: { contains: filters.search, mode: "insensitive" } },
        { accountNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return await prisma.paymentAccount.count({ where });
  }
}

export const paymentAccountRepository = new PaymentAccountRepository();
