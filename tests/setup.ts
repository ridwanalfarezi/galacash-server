import { mock } from 'bun:test';
import fs from 'fs';
import path from 'path';

process.env.NODE_ENV = 'test';

const testEnvPath = path.resolve(__dirname, '../.env.test');

if (process.env.CI !== 'true' && fs.existsSync(testEnvPath)) {
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

process.env.JWT_SECRET ||= 'test-only-access-secret-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-only-refresh-secret-at-least-32-characters';

// Mock console.log to keep test output clean, if desired.
// console.log = mock(() => {});

const mockRedisStore = new Map<string, string>();

// Mock express-rate-limit to bypass Redis connection in tests
mock.module('express-rate-limit', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
}));

// Keep upload tests hermetic: middleware generates deterministic mock:// URLs in test mode.
mock.module('@/config/storage.config', () => ({
  isGCPAvailable: false,
  uploadToGCS: async () => {
    throw new Error('uploadToGCS should not be called in tests');
  },
}));

// Mock Redis config to prevent undefined redisClient errors while preserving state
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
    get: (key: string) => Promise.resolve(mockRedisStore.get(key) ?? null),
    set: (key: string, val: string) => {
      mockRedisStore.set(key, val);
      return Promise.resolve('OK');
    },
    del: (...keys: string[]) => {
      keys.forEach((k) => mockRedisStore.delete(k));
      return Promise.resolve(keys.length);
    },
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
  safeRedisGet: async (key: string) => mockRedisStore.get(key) ?? null,
  safeRedisSet: async (key: string, val: string) => {
    mockRedisStore.set(key, val);
  },
  safeRedisExists: async (key: string) => mockRedisStore.has(key),
  safeRedisDel: async (keyPattern: string) => {
    if (keyPattern.endsWith('*')) {
      const prefix = keyPattern.slice(0, -1);
      for (const k of mockRedisStore.keys()) {
        if (k.startsWith(prefix)) mockRedisStore.delete(k);
      }
    } else {
      mockRedisStore.delete(keyPattern);
    }
  },
  safeRedisIncr: async (key: string) => {
    const curr = mockRedisStore.has(key) ? parseInt(mockRedisStore.get(key)!, 10) : 1;
    const next = curr + 1;
    mockRedisStore.set(key, next.toString());
    return next;
  },
  acquireLock: async (key: string) => {
    if (mockRedisStore.has(key)) return { acquired: false, token: '' };
    const token = `token-${Math.random()}`;
    mockRedisStore.set(key, token);
    return { acquired: true, token };
  },
  releaseLock: async (key: string, token: string) => {
    if (mockRedisStore.get(key) === token) {
      mockRedisStore.delete(key);
      return true;
    }
    return false;
  },
  safeRedisSetNX: async (key: string, value: string) => {
    if (mockRedisStore.has(key)) return false;
    mockRedisStore.set(key, value);
    return true;
  },
}));
