import dotenv from "dotenv";
import path from "path";
import { vi } from "vitest";

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

// Mock console.log to keep test output clean, if desired.
// console.log = vi.fn();

// Mock express-rate-limit to bypass Redis connection in tests
vi.mock("express-rate-limit", () => ({
  rateLimit: () => (req: any, res: any, next: any) => next(),
}));
