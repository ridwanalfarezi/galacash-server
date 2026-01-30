import dotenv from "dotenv";
import path from "path";
import { vi } from "vitest";
import bcrypt from "bcrypt";

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

// Mock console.log to keep test output clean, if desired.
// console.log = vi.fn();

// Mock express-rate-limit to bypass Redis connection in tests
vi.mock("express-rate-limit", () => ({
  rateLimit: () => (req: any, res: any, next: any) => next(),
}));

// Polyfill Bun.password for tests running in Node environment
if (!globalThis.Bun) {
  // @ts-expect-error - Polyfill for testing
  globalThis.Bun = {
    password: {
      verify: async (password: string, hash: string) => {
        return bcrypt.compare(password, hash);
      },
      hash: async (password: string, options: any) => {
        const rounds = options?.cost || 10;
        return bcrypt.hash(password, rounds);
      },
    },
  };
}
