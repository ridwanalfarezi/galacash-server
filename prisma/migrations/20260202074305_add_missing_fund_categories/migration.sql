-- AlterEnum: Add missing values to FundCategory enum
ALTER TYPE "FundCategory" ADD VALUE IF NOT EXISTS 'subscription';
ALTER TYPE "FundCategory" ADD VALUE IF NOT EXISTS 'consumption';
ALTER TYPE "FundCategory" ADD VALUE IF NOT EXISTS 'competition';
ALTER TYPE "FundCategory" ADD VALUE IF NOT EXISTS 'printing';
ALTER TYPE "FundCategory" ADD VALUE IF NOT EXISTS 'donation';
ALTER TYPE "FundCategory" ADD VALUE IF NOT EXISTS 'other';
