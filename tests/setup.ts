import { mock } from 'bun:test';
import fs from 'fs';
import path from 'path';

const testEnvPath = path.resolve(__dirname, '../.env.test');

if (fs.existsSync(testEnvPath)) {
  const envFile = fs.readFileSync(testEnvPath, 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmedLine.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, equalsIndex).trim();
    let value = trimmedLine.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

delete process.env.PRISMA_DATABASE_URL;

// Mock console.log to keep test output clean, if desired.
// console.log = mock(() => {});

// Mock express-rate-limit to bypass Redis connection in tests
mock.module('express-rate-limit', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rateLimit: () => (req: any, res: any, next: any) => next(),
}));

// Mock Redis config to prevent undefined redisClient errors
mock.module('@/config/redis.config', () => ({
  redisClient: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call: (command: string, ...args: any[]) => {
      if (command === 'SCRIPT' && args[0] === 'LOAD') {
        return Promise.resolve('mock-script-sha');
      }
      return Promise.resolve();
    },
    status: 'ready',
    get: () => Promise.resolve(null),
    set: () => Promise.resolve('OK'),
    del: () => Promise.resolve(1),
    scanStream: () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on: (event: string, callback: any) => {
        if (event === 'end') callback();
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
  safeRedisExists: async () => false,
  safeRedisDel: async () => {},
}));
