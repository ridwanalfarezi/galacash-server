-- Bring the migration history back in sync with the current Prisma schema.
ALTER TYPE "TransactionCategory" ADD VALUE 'education';
ALTER TYPE "TransactionCategory" ADD VALUE 'health';
ALTER TYPE "TransactionCategory" ADD VALUE 'emergency';
ALTER TYPE "TransactionCategory" ADD VALUE 'equipment';
ALTER TYPE "TransactionCategory" ADD VALUE 'fine';
ALTER TYPE "TransactionCategory" ADD VALUE 'printing';
ALTER TYPE "TransactionCategory" ADD VALUE 'transport';
ALTER TYPE "TransactionCategory" ADD VALUE 'social';
ALTER TYPE "TransactionCategory" ADD VALUE 'subscription';
ALTER TYPE "TransactionCategory" ADD VALUE 'competition';

ALTER TABLE "users"
ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 1;
