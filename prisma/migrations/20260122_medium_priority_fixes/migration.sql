-- Migration: Medium Priority Fixes
-- Changes month from String to Int, adds composite indexes for performance

-- AlterTable cash_bills - change month from TEXT to INTEGER
-- First, we need to convert existing data from month names to numbers
-- This assumes months are in Indonesian format: "Januari", "Februari", etc.

-- Create a temporary function to convert month names to numbers (PostgreSQL)
CREATE OR REPLACE FUNCTION month_name_to_number(month_name TEXT) RETURNS INTEGER AS $$
BEGIN
  RETURN CASE month_name
    WHEN 'Januari' THEN 1
    WHEN 'Februari' THEN 2
    WHEN 'Maret' THEN 3
    WHEN 'April' THEN 4
    WHEN 'Mei' THEN 5
    WHEN 'Juni' THEN 6
    WHEN 'Juli' THEN 7
    WHEN 'Agustus' THEN 8
    WHEN 'September' THEN 9
    WHEN 'Oktober' THEN 10
    WHEN 'November' THEN 11
    WHEN 'Desember' THEN 12
    ELSE 1 -- Default to January if unknown
  END;
END;
$$ LANGUAGE plpgsql;

-- Add temporary column
ALTER TABLE "cash_bills" ADD COLUMN "month_temp" INTEGER;

-- Convert existing data
UPDATE "cash_bills" SET "month_temp" = month_name_to_number("month");

-- Drop old column and rename new one
ALTER TABLE "cash_bills" DROP COLUMN "month";
ALTER TABLE "cash_bills" RENAME COLUMN "month_temp" TO "month";

-- Make month NOT NULL with default 1
ALTER TABLE "cash_bills" ALTER COLUMN "month" SET NOT NULL;
ALTER TABLE "cash_bills" ALTER COLUMN "month" SET DEFAULT 1;

-- Drop the temporary function
DROP FUNCTION month_name_to_number(TEXT);

-- CreateIndex - Composite indexes for common query patterns
CREATE INDEX "cash_bills_userId_status_dueDate_idx" ON "cash_bills"("userId", "status", "dueDate");
CREATE INDEX "cash_bills_classId_status_dueDate_idx" ON "cash_bills"("classId", "status", "dueDate");
CREATE INDEX "cash_bills_status_dueDate_idx" ON "cash_bills"("status", "dueDate");
CREATE INDEX "cash_bills_month_year_idx" ON "cash_bills"("month", "year");

-- CreateIndex - status index on payment_accounts for filtering active accounts
CREATE INDEX "payment_accounts_status_idx" ON "payment_accounts"("status");
