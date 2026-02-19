import app from '@/app';
import { prisma } from '@/utils/prisma-client';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { loginUser } from '../helpers/auth';
import { resetDb } from '../helpers/reset-db';

describe('Dashboard Integration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe('GET /api/dashboard/summary', () => {
    it('should return dashboard summary for authenticated user', async () => {
      const cookie = await loginUser('1313624000', 'user');

      const response = await request(app).get('/api/dashboard/summary').set('Cookie', [cookie]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should accept date range query parameters', async () => {
      const cookie = await loginUser('1313624000', 'user');

      const response = await request(app)
        .get('/api/dashboard/summary')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .set('Cookie', [cookie]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/dashboard/summary');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/dashboard/pending-bills', () => {
    it('should return pending bills for authenticated user', async () => {
      const cookie = await loginUser('1313624000', 'user');

      const response = await request(app)
        .get('/api/dashboard/pending-bills')
        .set('Cookie', [cookie]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return bills when user has pending cash bills', async () => {
      const cookie = await loginUser('1313624000', 'user');

      // Look up the user created by loginUser
      const user = await prisma.user.findUnique({ where: { nim: '1313624000' } });

      // Create a pending bill
      await prisma.cashBill.create({
        data: {
          userId: user!.id,
          classId: user!.classId,
          billId: 'BILL-2024-01-TEST',
          month: 1,
          year: 2024,
          dueDate: new Date('2024-02-01'),
          kasKelas: 15000,
          biayaAdmin: 0,
          totalAmount: 15000,
          status: 'belum_dibayar',
        },
      });

      const response = await request(app)
        .get('/api/dashboard/pending-bills')
        .set('Cookie', [cookie]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/dashboard/pending-bills');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/dashboard/pending-applications', () => {
    it('should return pending applications for authenticated user', async () => {
      const cookie = await loginUser('1313624000', 'user');

      const response = await request(app)
        .get('/api/dashboard/pending-applications')
        .set('Cookie', [cookie]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return applications when user has pending fund applications', async () => {
      const cookie = await loginUser('1313624000', 'user');

      // Look up the user created by loginUser
      const user = await prisma.user.findUnique({ where: { nim: '1313624000' } });

      // Create a pending fund application
      await prisma.fundApplication.create({
        data: {
          userId: user!.id,
          classId: user!.classId,
          purpose: 'Test Fund Application',
          category: 'competition',
          amount: 50000,
          status: 'pending',
        },
      });

      const response = await request(app)
        .get('/api/dashboard/pending-applications')
        .set('Cookie', [cookie]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/dashboard/pending-applications');

      expect(response.status).toBe(401);
    });
  });
});
