import { mock } from "bun:test";

// Load test environment variables is handled by Bun automatic loading or run config
// dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

// Mock console.log to keep test output clean, if desired.
// console.log = mock(() => {});

// Mock express-rate-limit to bypass Redis connection in tests
mock.module("express-rate-limit", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rateLimit: () => (req: any, res: any, next: any) => next(),
}));

// Mock Redis config to prevent undefined redisClient errors
mock.module("@/config/redis.config", () => ({
  redisClient: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call: (command: string, ...args: any[]) => {
      if (command === "SCRIPT" && args[0] === "LOAD") {
        return Promise.resolve("mock-script-sha");
      }
      return Promise.resolve();
    },
    status: "ready",
    get: () => Promise.resolve(null),
    set: () => Promise.resolve("OK"),
    del: () => Promise.resolve(1),
    scanStream: () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on: (event: string, callback: any) => {
        if (event === "end") callback();
        return this;
      },
      pause: () => {},
      resume: () => {},
    }),
    pipeline: () => ({
      del: () => {},
      exec: () => Promise.resolve(),
    }),
  },
  isRedisAvailable: true,
  connectRedis: async () => {},
  disconnectRedis: async () => {},
  safeRedisGet: async () => null,
  safeRedisSet: async () => {},
  safeRedisDel: async () => {},
}));
