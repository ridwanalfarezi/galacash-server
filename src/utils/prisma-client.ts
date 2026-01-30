import { PrismaClient } from "@/prisma/generated/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { logger } from "./logger";

const createPrismaClient = () => {
  const datasourceUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL;

  if (!datasourceUrl) {
    const errorMsg = "Neither PRISMA_DATABASE_URL nor DATABASE_URL is set. Prisma cannot connect.";
    logger.error(errorMsg);
    logger.error(
      "Server will start but database operations will fail until DATABASE_URL is configured."
    );
    throw new Error("Database URL not configured");
  }

  logger.info(
    `[PRISMA] Initializing Prisma Client with datasource: ${datasourceUrl.includes("accelerate") ? "Prisma Accelerate" : "Direct Connection"}`
  );

  try {
    const client = new PrismaClient({
      accelerateUrl: datasourceUrl,
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    }).$extends(withAccelerate());

    logger.info("[PRISMA] Prisma Client created successfully");
    return client;
  } catch (error) {
    logger.error("[PRISMA] Failed to create Prisma Client:", error);
    throw error;
  }
};

export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

/**
 * Prisma client singleton instance using Prisma Accelerate / Data Proxy
 * LAZY INITIALIZATION: Only creates client when first accessed, not at module load
 */
let prismaInstance: ExtendedPrismaClient | null = null;

/**
 * Get Prisma Client instance (lazy initialization)
 * Only creates the client when first accessed, preventing blocking on module import
 */
export const getPrisma = (): ExtendedPrismaClient => {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
  }
  return prismaInstance;
};

// Export a proxy that lazy-loads Prisma for backwards compatibility
export const prisma = new Proxy({} as ExtendedPrismaClient, {
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
