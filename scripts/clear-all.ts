import "dotenv/config";
import { prisma } from "../src/utils/prisma-client";

async function clearAll() {
  try {
    console.log("🗑️  Deleting all users...");
    const deletedUsers = await prisma.user.deleteMany();
    console.log(`✅ Deleted ${deletedUsers.count} users`);

    console.log("🗑️  Deleting all classes...");
    const deletedClasses = await prisma.class.deleteMany();
    console.log(`✅ Deleted ${deletedClasses.count} classes`);

    console.log("\n✅ Database cleared successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAll();
