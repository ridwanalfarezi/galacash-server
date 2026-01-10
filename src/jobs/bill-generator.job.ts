import { logger } from "@/utils/logger";
import { prisma } from "@/utils/prisma-client";
import cron from "node-cron";
import { v4 as uuidv4 } from "uuid";

const BILL_GENERATION_SCHEDULE = process.env.BILL_GENERATION_SCHEDULE || "0 0 1 * *"; // Default: 1st of every month at midnight

const KAS_KELAS_AMOUNT = 10000; // Rp 10,000 per month
const BIAYA_ADMIN = 1000; // Rp 1,000 admin fee

/**
 * Generate monthly bills for all users
 */
async function generateMonthlyBills(): Promise<void> {
  try {
    logger.info("🔄 Starting monthly bill generation...");

    const now = new Date();
    const month = now.toLocaleString("id-ID", { month: "long" });
    const year = now.getFullYear();
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 10); // Due on 10th of next month

    // Get all users with role 'user' (exclude bendahara)
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
    });

    if (users.length === 0) {
      logger.warn("No users found for bill generation");
      return;
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Check if bill already exists for this user and month
      const existingBill = await prisma.cashBill.findFirst({
        where: {
          userId: user.id,
          month,
          year,
        },
      });

      if (existingBill) {
        logger.info(`Bill already exists for ${user.name} (${user.nim}) for ${month} ${year}`);
        skippedCount++;
        continue;
      }

      // Generate unique bill ID
      const billId = `BILL-${year}-${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${uuidv4().slice(0, 8).toUpperCase()}`;

      const totalAmount = KAS_KELAS_AMOUNT + BIAYA_ADMIN;

      // Create bill
      await prisma.cashBill.create({
        data: {
          userId: user.id,
          classId: user.classId,
          billId,
          month,
          year,
          dueDate,
          kasKelas: KAS_KELAS_AMOUNT,
          biayaAdmin: BIAYA_ADMIN,
          totalAmount,
          status: "belum_dibayar",
        },
      });

      createdCount++;
      logger.info(`✅ Created bill ${billId} for ${user.name} (${user.nim}) - ${month} ${year}`);
    }

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
