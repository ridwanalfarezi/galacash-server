import app from '@/app';
import { prisma } from '@/utils/prisma-client';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'bun:test';
import { createTestUser } from '../helpers/auth';
import { resetDb } from '../helpers/reset-db';

describe('Cron Integration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe('GET /api/cron/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/cron/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Cron endpoint is healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/cron/generate-bills', () => {
    it('should reject request without cron secret key', async () => {
      // Set CRON_SECRET_KEY to enforce auth
      const originalKey = process.env.CRON_SECRET_KEY;
      process.env.CRON_SECRET_KEY = 'test-secret-key';

      const response = await request(app).post('/api/cron/generate-bills');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      // Restore
      if (originalKey) {
        process.env.CRON_SECRET_KEY = originalKey;
      } else {
        delete process.env.CRON_SECRET_KEY;
      }
    });

    it('should accept request with valid cron secret key', async () => {
      const originalKey = process.env.CRON_SECRET_KEY;
      process.env.CRON_SECRET_KEY = 'test-secret-key';

      // Create test users first so bill generation has users to process
      await createTestUser('1313624000', 'user');

      const response = await request(app)
        .post('/api/cron/generate-bills')
        .set('X-CloudScheduler-Key', 'test-secret-key');

      const isSemesterBreak = [1, 2, 7, 8].includes(new Date().getMonth() + 1);
      expect(response.status).toBe(isSemesterBreak ? 423 : 200);
      expect(response.body.success).toBe(!isSemesterBreak);

      // Restore
      if (originalKey) {
        process.env.CRON_SECRET_KEY = originalKey;
      } else {
        delete process.env.CRON_SECRET_KEY;
      }
    });

    it('should not create duplicate bills for same month/year', async () => {
      const originalKey = process.env.CRON_SECRET_KEY;
      process.env.CRON_SECRET_KEY = 'test-secret-key';

      await createTestUser('1313624000', 'user');

      // Run bill generation twice
      await request(app)
        .post('/api/cron/generate-bills')
        .set('X-CloudScheduler-Key', 'test-secret-key');

      await request(app)
        .post('/api/cron/generate-bills')
        .set('X-CloudScheduler-Key', 'test-secret-key');

      // Count bills for this user — should not have duplicates
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const bills = await prisma.cashBill.findMany({
        where: {
          user: { nim: '1313624000' },
          month,
          year,
        },
      });

      // Should be 0 or 1 (0 if semester break month, 1 otherwise)
      expect(bills.length).toBeLessThanOrEqual(1);

      // Restore
      if (originalKey) {
        process.env.CRON_SECRET_KEY = originalKey;
      } else {
        delete process.env.CRON_SECRET_KEY;
      }
    });

    it('should reject request with wrong cron secret key', async () => {
      const originalKey = process.env.CRON_SECRET_KEY;
      process.env.CRON_SECRET_KEY = 'correct-key';

      const response = await request(app)
        .post('/api/cron/generate-bills')
        .set('X-CloudScheduler-Key', 'wrong-key');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      // Restore
      if (originalKey) {
        process.env.CRON_SECRET_KEY = originalKey;
      } else {
        delete process.env.CRON_SECRET_KEY;
      }
    });
  });
});
