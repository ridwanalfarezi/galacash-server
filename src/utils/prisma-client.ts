import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import "dotenv/config";
import { logger } from "./logger";

/**
 * Prisma client singleton instance using Prisma Accelerate / Data Proxy
 */
const prismaClientSingleton = () => {
  const datasourceUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL;
  if (!datasourceUrl) {
    logger.error("Neither PRISMA_DATABASE_URL nor DATABASE_URL is set. Prisma cannot connect.");
    throw new Error("Database URL not configured");
  }

  logger.info(`Using datasource: ${datasourceUrl.includes('accelerate') ? 'Prisma Accelerate' : 'Direct Connection'}`);

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  }).$extends(withAccelerate());
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

// Handle Prisma shutdown gracefully
export const disconnectPrisma = async () => {
  try {
    await prisma.$disconnect();
    logger.info("Prisma disconnected successfully");
  } catch (error) {
    logger.error("Error disconnecting Prisma:", error);
  }
};
