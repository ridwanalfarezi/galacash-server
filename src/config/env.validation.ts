import { logger } from '../utils/logger.js';

interface SecretValidation {
  key: string;
  minLength: number;
  required: boolean;
}

const REQUIRED_SECRETS: SecretValidation[] = [
  { key: 'JWT_SECRET', minLength: 32, required: true },
  {
    key: 'JWT_REFRESH_SECRET',
    minLength: 32,
    required: true,
  },
];

export function validateEnvironment(): void {
  logger.info('[STARTUP] Validating environment variables...');
  const errors: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  for (const secret of REQUIRED_SECRETS) {
    const value = process.env[secret.key];

    if (!value) {
      errors.push(`${secret.key} is not set`);
      continue;
    }

    if (value.length < secret.minLength) {
      errors.push(
        `${secret.key} must be at least ${secret.minLength} characters (got ${value.length})`
      );
    }

    // Check for placeholder values
    const lowerValue = value.toLowerCase();
    if (
      lowerValue.includes('your_') ||
      lowerValue.includes('change_me') ||
      lowerValue.includes('placeholder') ||
      lowerValue === 'secret' ||
      lowerValue === 'jwt_secret'
    ) {
      errors.push(
        `${secret.key} appears to be a placeholder value - please use a secure random string`
      );
    }
  }

  if (isProduction) {
    const databaseUrl =
      process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
    const requiredProductionVariables = ['REDIS_URL', 'SUPABASE_URL', 'SUPABASE_STORAGE_BUCKET'];

    for (const key of requiredProductionVariables) {
      if (!process.env[key]) {
        errors.push(`${key} is not set`);
      }
    }

    if (!databaseUrl) {
      errors.push('DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL must be set');
    }

    if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      errors.push('SUPABASE_SECRET_KEY is not set');
    }

    if (databaseUrl && !databaseUrl.startsWith('postgres')) {
      errors.push('Database URL must be a PostgreSQL connection string');
    }

    if (process.env.REDIS_URL && !process.env.REDIS_URL.startsWith('rediss://')) {
      errors.push('REDIS_URL must use rediss:// in production');
    }
  }

  if (errors.length > 0) {
    logger.error('❌ Environment validation failed:');
    errors.forEach((error) => logger.error(`  - ${error}`));
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  logger.info('✅ Environment validation passed');
}
