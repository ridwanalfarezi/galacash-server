import app from '@/app';
import { prisma } from '@/utils/prisma-client';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { loginUser } from '../helpers/auth';
import { resetDb } from '../helpers/reset-db';

describe('Auth Logout Integration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with authenticated user', async () => {
      const cookie = await loginUser('1313624000', 'user');

      const response = await request(app).post('/api/auth/logout').set('Cookie', [cookie]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout berhasil');

      // Should clear cookies
      const setCookies = response.headers['set-cookie'];
      expect(setCookies).toBeDefined();
      // Cleared cookies will have empty value or past expiry
      const accessCookie = setCookies.find((c: string) => c.startsWith('accessToken='));
      expect(accessCookie).toBeDefined();
    });

    it('should delete refresh tokens from database after logout', async () => {
      const cookie = await loginUser('1313624000', 'user');

      // Verify refresh token exists before logout
      const tokensBefore = await prisma.refreshToken.findMany({
        where: {
          user: { nim: '1313624000' },
        },
      });
      expect(tokensBefore.length).toBeGreaterThan(0);

      await request(app).post('/api/auth/logout').set('Cookie', [cookie]);

      // Verify refresh tokens are deleted after logout
      const tokensAfter = await prisma.refreshToken.findMany({
        where: {
          user: { nim: '1313624000' },
        },
      });
      expect(tokensAfter).toHaveLength(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
