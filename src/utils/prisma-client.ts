import { PrismaClient } from '../prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { logger } from './logger.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExtendedPrismaClient = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createPrismaClient = (): any => {
  const datasourceUrl =
    process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!datasourceUrl) {
    const errorMsg = 'No PostgreSQL connection URL is set. Prisma cannot connect.';
    logger.error(errorMsg);
    throw new Error('Database URL not configured');
  }

  const configuredPoolMax = Number.parseInt(process.env.DATABASE_POOL_MAX || '1', 10);
  const poolMax =
    Number.isFinite(configuredPoolMax) && configuredPoolMax > 0 ? configuredPoolMax : 1;
  logger.info(`[PRISMA] Initializing PostgreSQL client with pool max ${poolMax}`);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientConfig: any = {
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    };

    // Vercel functions should use Supabase's transaction pooler (port 6543).
    // Keeping this application-side pool small prevents each warm function
    // instance from reserving too many database connections.
    const connectionUrl = new URL(datasourceUrl);
    if (connectionUrl.searchParams.get('sslmode') === 'require') {
      connectionUrl.searchParams.set('uselibpqcompat', 'true');
    }

    const pool = new Pool({
      connectionString: connectionUrl.toString(),
      max: poolMax,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
    clientConfig.adapter = new PrismaPg(pool);

    const client = new PrismaClient(clientConfig);
    logger.info('[PRISMA] Prisma Client created successfully');
    return client;
  } catch (error) {
    logger.error('[PRISMA] Failed to create Prisma Client:', error);
    throw error;
  }
};

/**
 * Prisma client singleton instance.
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
      logger.info('Prisma disconnected successfully');
    }
  } catch (error) {
    logger.error('Error disconnecting Prisma:', error);
  }
};
