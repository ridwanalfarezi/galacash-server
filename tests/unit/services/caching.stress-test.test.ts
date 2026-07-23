import { describe, expect, it, mock, spyOn } from 'bun:test';
import { acquireLock } from '@/config/redis.config';
import { authService } from '@/services/auth.service';
import { cacheService } from '@/services/cache.service';
import { transactionService } from '@/services/transaction.service';
import { NotFoundError } from '@/utils/errors';
import { transactionRepository } from '@/repositories/transaction.repository';

const mockPrismaUserUpdate = mock(async (args: any) => ({
  id: args?.where?.id || 'user-revocation-test-id',
  tokenVersion: 2,
}));
const mockPrismaTokenDeleteMany = mock(async (_args?: unknown) => ({ count: 1 }));

mock.module('@/utils/prisma-client', () => ({
  prisma: {
    refreshToken: {
      deleteMany: (args: any) => mockPrismaTokenDeleteMany(args),
    },
    user: {
      update: (args: any) => mockPrismaUserUpdate(args),
    },
  },
}));

describe('Financial Caching Stress Test Suite', () => {
  // ============ 1. STALE BALANCE HAZARD (EPOCH VERSIONING) ============
  describe('Hazard 1: Financial Epoch Versioning', () => {
    it('should increment financial epoch upon transaction invalidation', async () => {
      const initialEpoch = await cacheService.getFinancialEpoch('all');
      await cacheService.invalidateTransactions('all');
      const newEpoch = await cacheService.getFinancialEpoch('all');

      expect(newEpoch).toBeGreaterThan(initialEpoch);
    });

    it('should generate versioned balance keys tied to current epoch', async () => {
      const key1 = await cacheService.getVersionedBalanceKey('all');
      await cacheService.invalidateTransactions('all');
      const key2 = await cacheService.getVersionedBalanceKey('all');

      expect(key1).not.toBe(key2);
      expect(key2).toContain(`v${await cacheService.getFinancialEpoch('all')}`);
    });
  });

  // ============ 3. CACHE PENETRATION DEFENSE ============
  describe('Hazard 3: Cache Penetration & Negative Sentinel Caching', () => {
    it('should reject invalid UUID formats immediately without querying DB', async () => {
      await expect(transactionService.getTransactionById('tx_fake_00000001')).rejects.toThrow(
        NotFoundError
      );
      await expect(transactionService.getTransactionById('tx_fake_00000001')).rejects.toThrow(
        'Invalid transaction ID format'
      );
    });

    it('should store "__NULL__" sentinel in cache when a valid UUID is not found in DB', async () => {
      const fakeUuid = '00000000-0000-4000-a000-000000000001';

      // Mock repository findById to return null (record not found)
      const findByIdSpy = spyOn(transactionRepository, 'findById').mockResolvedValue(null);

      // First lookup: misses Redis, queries DB (returns null), stores __NULL__ sentinel in cache
      await expect(transactionService.getTransactionById(fakeUuid)).rejects.toThrow(
        'Transaction not found'
      );
      expect(findByIdSpy).toHaveBeenCalledTimes(1);

      // Verify negative sentinel is cached
      const cacheKey = cacheService.transactionKey(fakeUuid);
      const cachedVal = await cacheService.getCached<string>(cacheKey);
      expect(cachedVal).toBe('__NULL__');

      // Second lookup: hits __NULL__ negative cache sentinel directly without calling findById again
      await expect(transactionService.getTransactionById(fakeUuid)).rejects.toThrow(
        'Transaction not found'
      );
      expect(findByIdSpy).toHaveBeenCalledTimes(1); // DB call count remains 1!

      findByIdSpy.mockRestore();
    });
  });

  // ============ 4. AUTH SESSION & TOKEN REVOCATION DRIFT ============
  describe('Hazard 4: Auth Session Revocation & Fast-Path Token Versioning', () => {
    it('should increment tokenVersion and revoke all sessions instantly', async () => {
      const userId = 'user-revocation-test-id';

      // Revoke all sessions
      await authService.revokeAllSessions(userId);

      expect(mockPrismaTokenDeleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });

      // Check Redis fast-path version key updated
      const cachedVersion = await cacheService.getCached<string>(cacheService.userVersionKey(userId));
      expect(cachedVersion).toBe('2');
    });
  });

  // ============ 5. ADDITIONAL AUDIT HAZARD TESTS ============
  describe('Audit Fixes: PayBill Locking & Password Session Revocation', () => {
    it('payBill should fail fast when a concurrent payment lock is active', async () => {
      const { cashBillService } = await import('@/services/cash-bill.service');
      const billId = 'bill-lock-test-id';

      // Pre-acquire lock for this bill
      const lockKey = `lock:bill:pay:${billId}`;
      await acquireLock(lockKey, 10);

      // Attempting to pay the bill while locked should throw BusinessLogicError
      await expect(
        cashBillService.payBill(billId, 'user-123', 'bank', 'http://proof.png')
      ).rejects.toThrow('Payment submission is currently being processed for this bill');
    });

    it('changePassword should invoke revokeAllSessions to invalidate active JWTs across devices', async () => {
      const { userService } = await import('@/services/user.service');
      const { userRepository } = await import('@/repositories/user.repository');
      const userId = 'user-pwd-change-id';

      const findUserSpy = spyOn(userRepository, 'findById').mockResolvedValue({
        id: userId,
        password: await Bun.password.hash('oldPassword123', { algorithm: 'bcrypt', cost: 10 }),
      } as any);

      const updateUserSpy = spyOn(userRepository, 'update').mockResolvedValue({
        id: userId,
      } as any);

      // Execute password change
      await userService.changePassword(userId, 'oldPassword123', 'newPassword123');

      // Verify tokenVersion increment was triggered via mockPrismaUserUpdate
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });

      findUserSpy.mockRestore();
      updateUserSpy.mockRestore();
    });
  });
});
