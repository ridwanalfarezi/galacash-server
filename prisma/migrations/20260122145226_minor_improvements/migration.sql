-- AlterTable: Add updatedAt with default value for existing rows
ALTER TABLE "transactions" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop the default value for future rows (so application MUST provide it, or Prisma @updatedAt handles it)
ALTER TABLE "transactions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CHECK Constraints (Database Level Validation)

-- 1. Ensure transaction amounts are positive
ALTER TABLE "transactions" 
ADD CONSTRAINT "check_transaction_amount_positive" 
CHECK ("amount" >= 0);

-- 2. Ensure fund application amounts are positive
ALTER TABLE "fund_applications" 
ADD CONSTRAINT "check_fund_application_amount_positive" 
CHECK ("amount" >= 0);

-- 3. Ensure cash bill amounts are positive
ALTER TABLE "cash_bills" 
ADD CONSTRAINT "check_cash_bill_amounts_positive" 
CHECK ("kasKelas" >= 0 AND "biayaAdmin" >= 0 AND "totalAmount" >= 0);

-- 4. Ensure total calculation is correct (Optional, but strict)
-- Note: commented out because sometimes manual adjustments might differ slightly? 
-- Actually, strict consistency is good.
ALTER TABLE "cash_bills" 
ADD CONSTRAINT "check_cash_bill_total_sum" 
CHECK ("totalAmount" = "kasKelas" + "biayaAdmin");

-- 5. Ensure reasonable year
ALTER TABLE "cash_bills" 
ADD CONSTRAINT "check_year_reasonable" 
CHECK ("year" BETWEEN 2020 AND 2100);

-- 6. Ensure cash bill month is valid (1-12)
ALTER TABLE "cash_bills"
ADD CONSTRAINT "check_month_valid"
CHECK ("month" >= 1 AND "month" <= 12);
