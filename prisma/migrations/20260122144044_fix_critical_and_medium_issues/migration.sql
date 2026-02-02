/*
  Warnings:

  - A unique constraint covering the columns `[userId,month,year]` on the table `cash_bills` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "cash_bills" ALTER COLUMN "month" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "cash_bills_userId_month_year_key" ON "cash_bills"("userId", "month", "year");
