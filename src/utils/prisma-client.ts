import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import "dotenv/config";
import { logger } from "./logger";

/**
 * Prisma client singleton instance using Prisma Accelerate / Data Proxy
 * LAZY INITIALIZATION: Only creates client when first accessed, not at module load
 */
let prismaInstance: ReturnType<typeof createPrismaClient> | null = null;

const createPrismaClient = () => {
  const datasourceUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL;

  if (!datasourceUrl) {
    logger.error("Neither PRISMA_DATABASE_URL nor DATABASE_URL is set. Prisma cannot connect.");
    throw new Error("Database URL not configured");
  }

  logger.info(
    `Initializing Prisma Client with datasource: ${datasourceUrl.includes("accelerate") ? "Prisma Accelerate" : "Direct Connection"}`
  );

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  }).$extends(withAccelerate());
};

/**
 * Get Prisma Client instance (lazy initialization)
 * Only creates the client when first accessed, preventing blocking on module import
 */
export const getPrisma = () => {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
  }
  return prismaInstance;
};

// Export a proxy that lazy-loads Prisma for backwards compatibility
export const prisma = new Proxy({} as ReturnType<typeof createPrismaClient>, {
  get: (_target, prop) => {
    const client = getPrisma();
    return client[prop as keyof typeof client];
  },
});

// Handle Prisma shutdown gracefully
export const disconnectPrisma = async () => {
  try {
    if (prismaInstance) {
      await prismaInstance.$disconnect();
      logger.info("Prisma disconnected successfully");
    }
  } catch (error) {
    logger.error("Error disconnecting Prisma:", error);
  }
};
