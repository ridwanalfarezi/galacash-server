/**
 * Clean Data Script
 * Removes redundant CashBill and Transaction records for Class A
 *
 * Usage:
 *   bun scripts/clean-data.ts
 */

import "./load-env";

// Use dynamic import to avoid module resolution issues
const { prisma } = await import("../src/utils/prisma-client.ts");

async function cleanData() {
  try {
    console.log("🧹 Starting data cleanup...\n");

    // Get class A
    const classA = await prisma.class.findUnique({
      where: { name: "A" },
    });

    if (!classA) {
      throw new Error("Class A not found");
    }

    // Delete all transactions for class A
    console.log("🗑️  Deleting transactions for Class A...");
    const deletedTransactions = await prisma.transaction.deleteMany({
      where: { classId: classA.id },
    });
    console.log(`✅ Deleted ${deletedTransactions.count} transactions`);

    // Delete all cash bills for class A
    console.log("🗑️  Deleting cash bills for Class A...");
    const deletedBills = await prisma.cashBill.deleteMany({
      where: { classId: classA.id },
    });
    console.log(`✅ Deleted ${deletedBills.count} cash bills`);

    console.log("\n📊 Cleanup Summary:");
    console.log("============================================");
    console.log(`Transactions Deleted: ${deletedTransactions.count}`);
    console.log(`Cash Bills Deleted: ${deletedBills.count}`);
    console.log("============================================");
    console.log("✅ Data cleanup completed!\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
cleanData();
