-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('kas_kelas', 'donation', 'fundraising', 'office_supplies', 'consumption', 'event', 'maintenance', 'other');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "category" "TransactionCategory" NOT NULL DEFAULT 'other';

-- CreateIndex
CREATE INDEX "transactions_category_idx" ON "transactions"("category");
