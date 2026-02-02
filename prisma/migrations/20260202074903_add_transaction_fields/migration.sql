-- AlterTable: Add missing fields to transactions table
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "category" "TransactionCategory" DEFAULT 'other';
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Update existing rows to have updatedAt
UPDATE "transactions" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Make updatedAt NOT NULL after setting default values
ALTER TABLE "transactions" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Update amount column to use DECIMAL instead of DOUBLE PRECISION (if needed)
-- ALTER TABLE "transactions" ALTER COLUMN "amount" TYPE DECIMAL(12, 2);
