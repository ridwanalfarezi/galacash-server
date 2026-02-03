import { logger } from "@/utils/logger";
import { prisma } from "@/utils/prisma-client";
import cron from "node-cron";

const BILL_GENERATION_SCHEDULE = process.env.BILL_GENERATION_SCHEDULE || "0 0 1 * *";

const KAS_KELAS_AMOUNT = parseInt(process.env.KAS_KELAS_AMOUNT || "15000", 10);
const BIAYA_ADMIN = 0;
const BATCH_SIZE = 100;
const SEMESTER_BREAK_MONTHS = [1, 2, 7, 8];

/**
 * Generate monthly bills for all users using batch processing
 */
async function generateMonthlyBills(): Promise<void> {
  try {
    logger.info("🔄 Starting monthly bill generation...");

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    if (SEMESTER_BREAK_MONTHS.includes(month)) {
      logger.info(
        `🚫 Skipping bill generation for month ${month} (Holiday Month - Semester Break)`
      );
      return;
    }

    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const totalAmount = KAS_KELAS_AMOUNT + BIAYA_ADMIN;

    let createdCount = 0;
    let skippedCount = 0;
    let cursor: { id: string } | undefined;

    do {
      const users = await prisma.user.findMany({
        where: {
          role: "user",
        },
        select: {
          id: true,
          nim: true,
          name: true,
          classId: true,
        },
        take: BATCH_SIZE,
        cursor: cursor ? { id: cursor.id } : undefined,
      });

      if (users.length === 0) {
        break;
      }

      const userIds = users.map((u: { id: string }) => u.id);

      const existingBills = await prisma.cashBill.findMany({
        where: {
          userId: { in: userIds },
          month,
          year,
        },
        select: {
          userId: true,
        },
      });

      const existingUserIds = new Set(existingBills.map((b: { userId: string }) => b.userId));

      const billsToCreate = users
        .filter((user: { id: string }) => !existingUserIds.has(user.id))
        .map((user: { id: string; classId: string }) => ({
          userId: user.id,
          classId: user.classId,
          billId: `BILL-${year}-${month.toString().padStart(2, "0")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          month,
          year,
          dueDate,
          kasKelas: KAS_KELAS_AMOUNT,
          biayaAdmin: BIAYA_ADMIN,
          totalAmount,
          status: "belum_dibayar" as const,
        }));

      if (billsToCreate.length > 0) {
        try {
          await prisma.cashBill.createMany({
            data: billsToCreate,
            skipDuplicates: true,
          });

          createdCount += billsToCreate.length;
          logger.info(`✅ Created ${billsToCreate.length} bills for batch`);
        } catch (error) {
          logger.error(`Failed to create batch of bills:`, error);
        }
      }

      skippedCount += users.length - billsToCreate.length;

      cursor = { id: users[users.length - 1].id };
    } while (true);

    logger.info(
      `🎉 Monthly bill generation complete! Created: ${createdCount}, Skipped: ${skippedCount}`
    );
  } catch (error) {
    logger.error("❌ Monthly bill generation failed:", error);
  }
}

/**
 * Initialize bill generator cron job
 */
export function initializeBillGenerator(): void {
  // Validate cron expression
  if (!cron.validate(BILL_GENERATION_SCHEDULE)) {
    logger.error(`Invalid cron expression: ${BILL_GENERATION_SCHEDULE}. Bill generation disabled.`);
    return;
  }

  logger.info(`📅 Bill generator initialized with schedule: ${BILL_GENERATION_SCHEDULE}`);

  // Schedule the cron job
  cron.schedule(BILL_GENERATION_SCHEDULE, async () => {
    logger.info("⏰ Bill generation cron triggered");
    await generateMonthlyBills();
  });

  logger.info("✅ Bill generator cron job started successfully");
}

// Export for manual testing
export { generateMonthlyBills };
