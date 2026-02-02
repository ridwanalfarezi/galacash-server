-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('bank', 'ewallet');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "cash_bills" ADD COLUMN     "paymentAccountId" TEXT;

-- CreateTable
CREATE TABLE "payment_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "accountNumber" TEXT,
    "accountHolder" TEXT,
    "description" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cash_bills" ADD CONSTRAINT "cash_bills_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "payment_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
