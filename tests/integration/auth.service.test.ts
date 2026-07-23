import { AuthService } from '@/services/auth.service';
import { prisma } from '@/utils/prisma-client';
import { beforeEach, describe, expect, it } from 'bun:test';
import { getTestPasswordHash, TEST_PASSWORD } from '../helpers/auth';
import { resetDb } from '../helpers/reset-db';

describe('AuthService', () => {
  const authService = new AuthService();

  const captureError = async (operation: () => Promise<unknown>): Promise<Error> => {
    let caught: unknown;
    try {
      await operation();
    } catch (error) {
      caught = error;
    }

    if (!(caught instanceof Error)) {
      throw new Error('Expected operation to reject with an Error');
    }
    return caught;
  };

  beforeEach(async () => {
    await resetDb();
  });

  const createTestUser = async (nim = '1313624000', role = 'user') => {
    const cls = await prisma.class.create({
      data: { name: 'Test Class' },
    });

    const hashedPassword = await getTestPasswordHash();

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

      const result = await authService.login('1313624000', TEST_PASSWORD);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.nim).toBe('1313624000');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should not return password in user object', async () => {
      await createTestUser();

      const result = await authService.login('1313624000', TEST_PASSWORD);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.user as any).password).toBeUndefined();
    });

    it('should throw AuthenticationError for wrong password', async () => {
      await createTestUser();

      const error = await captureError(() => authService.login('1313624000', 'wrongpassword'));
      expect(error.message).toBe('Invalid NIM or password');
    });

    it('should throw AuthenticationError for non-existent NIM', async () => {
      const error = await captureError(() => authService.login('1313699999', TEST_PASSWORD));
      expect(error.message).toBe('Invalid NIM or password');
    });
  });

  // ============ REFRESH ============
  describe('refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      await createTestUser();
      const loginResult = await authService.login('1313624000', TEST_PASSWORD);

      const result = await authService.refresh(loginResult.refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should rotate refresh token (old token no longer valid)', async () => {
      await createTestUser();
      const loginResult = await authService.login('1313624000', TEST_PASSWORD);
      const oldRefreshToken = loginResult.refreshToken;

      // Use the refresh token
      await authService.refresh(oldRefreshToken);

      // Old refresh token should no longer work (it was deleted by rotation)
      expect(await captureError(() => authService.refresh(oldRefreshToken))).toBeInstanceOf(Error);
    });

    it('should throw AuthenticationError for invalid refresh token', async () => {
      expect(
        await captureError(() => authService.refresh('invalid-refresh-token'))
      ).toBeInstanceOf(Error);
    });
  });

  // ============ LOGOUT ============
  describe('logout', () => {
    it('should delete refresh token from database', async () => {
      await createTestUser();
      const loginResult = await authService.login('1313624000', TEST_PASSWORD);

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
      const error = await captureError(() => authService.getCurrentUser('non-existent-id'));
      expect(error.message).toBe('User not found');
    });
  });
});
