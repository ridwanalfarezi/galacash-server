import app from '@/app';
import { prisma } from '@/utils/prisma-client';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../helpers/reset-db';

describe('Auth Refresh Integration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  const createAndLoginUser = async () => {
    const cls = await prisma.class.create({
      data: { name: 'Test Class Refresh' },
    });

    const hashedPassword = await Bun.password.hash('password123', {
      algorithm: 'bcrypt',
      cost: 10,
    });

    await prisma.user.create({
      data: {
        nim: '1313624001',
        name: 'Test Student Refresh',
        password: hashedPassword,
        classId: cls.id,
        role: 'user',
      },
    });

    const loginResponse = await request(app).post('/api/auth/login').send({
      nim: '1313624001',
      password: 'password123',
    });

    return loginResponse;
  };

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully with valid refresh token', async () => {
      const loginResponse = await createAndLoginUser();
      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app).post('/api/auth/refresh').set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Should set new cookies
      const newCookies = response.headers['set-cookie'];
      expect(newCookies).toBeDefined();
      const cookieNames = newCookies.map((c: string) => c.split('=')[0]);
      expect(cookieNames).toContain('accessToken');
      expect(cookieNames).toContain('refreshToken');
    });

    it('should implement token rotation (old refresh token invalidated)', async () => {
      const loginResponse = await createAndLoginUser();
      const cookies = loginResponse.headers['set-cookie'];

      // First refresh should succeed
      const firstRefresh = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
      expect(firstRefresh.status).toBe(200);

      // Second refresh with same old cookies should fail (token rotated)
      const secondRefresh = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
      expect(secondRefresh.status).toBe(401);
    });

    it('should fail without refresh token cookie', async () => {
      const response = await request(app).post('/api/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=invalid-token']);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
