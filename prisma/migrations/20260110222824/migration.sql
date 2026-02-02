-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'bendahara');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "FundCategory" AS ENUM ('education', 'health', 'emergency', 'equipment');

-- CreateEnum
CREATE TYPE "FundStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('belum_dibayar', 'menunggu_konfirmasi', 'sudah_dibayar');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('bank', 'ewallet', 'cash');

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nim" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "avatarUrl" TEXT,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT,
    "category" "FundCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "FundStatus" NOT NULL DEFAULT 'pending',
    "attachmentUrl" TEXT,
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_bills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "kasKelas" DOUBLE PRECISION NOT NULL,
    "biayaAdmin" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'belum_dibayar',
    "paymentMethod" "PaymentMethod",
    "paymentProofUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_bills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "classes_name_key" ON "classes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_nim_key" ON "users"("nim");

-- CreateIndex
CREATE INDEX "users_classId_idx" ON "users"("classId");

-- CreateIndex
CREATE INDEX "users_nim_idx" ON "users"("nim");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "transactions_classId_idx" ON "transactions"("classId");

-- CreateIndex
CREATE INDEX "transactions_date_idx" ON "transactions"("date");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "fund_applications_userId_idx" ON "fund_applications"("userId");

-- CreateIndex
CREATE INDEX "fund_applications_classId_idx" ON "fund_applications"("classId");

-- CreateIndex
CREATE INDEX "fund_applications_status_idx" ON "fund_applications"("status");

-- CreateIndex
CREATE INDEX "fund_applications_createdAt_idx" ON "fund_applications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cash_bills_billId_key" ON "cash_bills"("billId");

-- CreateIndex
CREATE INDEX "cash_bills_userId_idx" ON "cash_bills"("userId");

-- CreateIndex
CREATE INDEX "cash_bills_classId_idx" ON "cash_bills"("classId");

-- CreateIndex
CREATE INDEX "cash_bills_status_idx" ON "cash_bills"("status");

-- CreateIndex
CREATE INDEX "cash_bills_dueDate_idx" ON "cash_bills"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "cash_bills_userId_month_year_key" ON "cash_bills"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_applications" ADD CONSTRAINT "fund_applications_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_applications" ADD CONSTRAINT "fund_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_applications" ADD CONSTRAINT "fund_applications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bills" ADD CONSTRAINT "cash_bills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bills" ADD CONSTRAINT "cash_bills_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bills" ADD CONSTRAINT "cash_bills_confirmedBy_fkey" FOREIGN KEY ("confirmedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
