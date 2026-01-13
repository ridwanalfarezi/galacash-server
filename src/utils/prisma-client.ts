import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import "dotenv/config";
import { logger } from "./logger";

/**
 * Prisma client singleton instance using Prisma Accelerate / Data Proxy
 */
const prismaClientSingleton = () => {
  const datasourceUrl = process.env.PRISMA_DATABASE_URL;
  if (!datasourceUrl) {
    logger.error("PRISMA_DATABASE_URL is not set. Prisma cannot connect.");
  }

  return new PrismaClient({
    datasourceUrl,
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
