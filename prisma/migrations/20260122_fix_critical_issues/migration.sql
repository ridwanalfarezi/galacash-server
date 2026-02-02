-- Migration: Change Float to Decimal for monetary values
-- This is a CRITICAL fix to prevent rounding errors in financial calculations

-- AlterTable transactions - change amount from DOUBLE PRECISION to DECIMAL(12,2)
ALTER TABLE "transactions" ALTER COLUMN "amount" TYPE DECIMAL(12,2);

-- AlterTable fund_applications - change amount from DOUBLE PRECISION to DECIMAL(12,2)
ALTER TABLE "fund_applications" ALTER COLUMN "amount" TYPE DECIMAL(12,2);

-- AlterTable cash_bills - change monetary columns from DOUBLE PRECISION to DECIMAL
ALTER TABLE "cash_bills" ALTER COLUMN "kasKelas" TYPE DECIMAL(10,2);
ALTER TABLE "cash_bills" ALTER COLUMN "biayaAdmin" TYPE DECIMAL(10,2);
ALTER TABLE "cash_bills" ALTER COLUMN "totalAmount" TYPE DECIMAL(10,2);

-- CreateIndex - add missing index on paymentAccountId foreign key
CREATE INDEX "cash_bills_paymentAccountId_idx" ON "cash_bills"("paymentAccountId");
