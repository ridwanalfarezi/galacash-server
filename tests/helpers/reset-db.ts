import { prisma } from "@/utils/prisma-client";

export const resetDb = async () => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetDb should only be used in test environment");
  }

  // Order matters due to foreign key constraints
  // Delete child tables first
  const deleteRefreshTokens = prisma.refreshToken.deleteMany();
  const deleteCashBills = prisma.cashBill.deleteMany();
  const deleteFundApplications = prisma.fundApplication.deleteMany();
  const deleteTransactions = prisma.transaction.deleteMany();
  const deleteUsers = prisma.user.deleteMany();
  const deleteClasses = prisma.class.deleteMany();
  const deletePaymentAccounts = prisma.paymentAccount.deleteMany();

  try {
    await prisma.$transaction([
      deleteRefreshTokens,
      deleteCashBills,
      deleteFundApplications,
      deleteTransactions,
      deleteUsers,
      deleteClasses,
      deletePaymentAccounts,
    ]);
  } catch (error) {
    console.error("Error resetting database:", error);
  }
};
