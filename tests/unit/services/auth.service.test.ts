import { AuthService } from '@/services/auth.service';
import { prisma } from '@/utils/prisma-client';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../../helpers/reset-db';

describe('AuthService', () => {
  const authService = new AuthService();

  beforeEach(async () => {
    await resetDb();
  });

  const createTestUser = async (nim = '1313624000', role = 'user') => {
    const cls = await prisma.class.create({
      data: { name: 'Test Class' },
    });

    const hashedPassword = await Bun.password.hash('password123', {
      algorithm: 'bcrypt',
      cost: 10,
    });

    const user = await prisma.user.create({
      data: {
        nim,
        name: `Test Student ${nim}`,
        password: hashedPassword,
        classId: cls.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: role as any,
      },
    });

    return { user, cls };
  };

  // ============ LOGIN ============
  describe('login', () => {
    it('should return user and tokens with valid credentials', async () => {
      await createTestUser();

      const result = await authService.login('1313624000', 'password123');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.nim).toBe('1313624000');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should not return password in user object', async () => {
      await createTestUser();

      const result = await authService.login('1313624000', 'password123');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.user as any).password).toBeUndefined();
    });

    it('should throw AuthenticationError for wrong password', async () => {
      await createTestUser();

      await expect(authService.login('1313624000', 'wrongpassword')).rejects.toThrow(
        'Invalid NIM or password'
      );
    });

    it('should throw AuthenticationError for non-existent NIM', async () => {
      await expect(authService.login('1313699999', 'password123')).rejects.toThrow(
        'Invalid NIM or password'
      );
    });
  });

  // ============ REFRESH ============
  describe('refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      await createTestUser();
      const loginResult = await authService.login('1313624000', 'password123');

      const result = await authService.refresh(loginResult.refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should rotate refresh token (old token no longer valid)', async () => {
      await createTestUser();
      const loginResult = await authService.login('1313624000', 'password123');
      const oldRefreshToken = loginResult.refreshToken;

      // Use the refresh token
      await authService.refresh(oldRefreshToken);

      // Old refresh token should no longer work (it was deleted by rotation)
      await expect(authService.refresh(oldRefreshToken)).rejects.toThrow();
    });

    it('should throw AuthenticationError for invalid refresh token', async () => {
      await expect(authService.refresh('invalid-refresh-token')).rejects.toThrow();
    });
  });

  // ============ LOGOUT ============
  describe('logout', () => {
    it('should delete refresh token from database', async () => {
      await createTestUser();
      const loginResult = await authService.login('1313624000', 'password123');

      await authService.logout(loginResult.refreshToken);

      // Verify token is deleted from DB
      const storedTokens = await prisma.refreshToken.findMany({
        where: { token: loginResult.refreshToken },
      });
      expect(storedTokens).toHaveLength(0);
    });
  });

  // ============ GET CURRENT USER ============
  describe('getCurrentUser', () => {
    it('should return user by ID', async () => {
      const { user } = await createTestUser();

      const result = await authService.getCurrentUser(user.id);

      expect(result.id).toBe(user.id);
      expect(result.nim).toBe(user.nim);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(authService.getCurrentUser('non-existent-id')).rejects.toThrow('User not found');
    });
  });
});
