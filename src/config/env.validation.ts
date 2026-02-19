import { logger } from "@/utils/logger";

interface SecretValidation {
  key: string;
  value: string | undefined;
  minLength: number;
  required: boolean;
}

const REQUIRED_SECRETS: SecretValidation[] = [
  { key: "JWT_SECRET", value: process.env.JWT_SECRET, minLength: 32, required: true },
  {
    key: "JWT_REFRESH_SECRET",
    value: process.env.JWT_REFRESH_SECRET,
    minLength: 32,
    required: true,
  },
];

export function validateEnvironment(): void {
  logger.info("[STARTUP] Validating environment variables...");
  const errors: string[] = [];

  for (const secret of REQUIRED_SECRETS) {
    if (!secret.value) {
      errors.push(`${secret.key} is not set`);
      continue;
    }

    if (secret.value.length < secret.minLength) {
      errors.push(
        `${secret.key} must be at least ${secret.minLength} characters (got ${secret.value.length})`
      );
    }

    // Check for placeholder values
    const lowerValue = secret.value.toLowerCase();
    if (
      lowerValue.includes("your_") ||
      lowerValue.includes("change_me") ||
      lowerValue.includes("placeholder") ||
      lowerValue === "secret" ||
      lowerValue === "jwt_secret"
    ) {
      errors.push(
        `${secret.key} appears to be a placeholder value - please use a secure random string`
      );
    }
  }

  if (errors.length > 0) {
    logger.error("❌ Environment validation failed:");
    errors.forEach((error) => logger.error(`  - ${error}`));
    throw new Error(`Environment validation failed:\n${errors.join("\n")}`);
  }

  logger.info("✅ Environment validation passed");
}
