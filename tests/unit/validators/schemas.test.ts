import {
  cashBillFilterSchema,
  changePasswordSchema,
  createFundApplicationSchema,
  createTransactionSchema,
  dateRangeSchema,
  exportTransactionSchema,
  loginSchema,
  paginationSchema,
  payBillSchema,
  rejectFundApplicationSchema,
  transactionFilterSchema,
  updateProfileSchema,
} from '@/validators/schemas';
import { describe, expect, it } from 'bun:test';

describe('Validator Schemas', () => {
  // ============ LOGIN SCHEMA ============
  describe('loginSchema', () => {
    it('should accept valid NIM and password', () => {
      const { error } = loginSchema.validate({
        nim: '1313600001',
        password: 'password123',
      });
      expect(error).toBeUndefined();
    });

    it('should reject NIM not starting with 13136', () => {
      const { error } = loginSchema.validate({
        nim: '1234567890',
        password: 'password123',
      });
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('13136');
    });

    it('should reject NIM with wrong length', () => {
      const { error } = loginSchema.validate({
        nim: '13136',
        password: 'password123',
      });
      expect(error).toBeDefined();
    });

    it('should reject password shorter than 8 characters', () => {
      const { error } = loginSchema.validate({
        nim: '1313600001',
        password: 'short',
      });
      expect(error).toBeDefined();
      expect(error!.details[0].message).toContain('8');
    });

    it('should reject missing nim', () => {
      const { error } = loginSchema.validate({ password: 'password123' });
      expect(error).toBeDefined();
    });

    it('should reject missing password', () => {
      const { error } = loginSchema.validate({ nim: '1313600001' });
      expect(error).toBeDefined();
    });

    it('should reject empty object', () => {
      const { error } = loginSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  // ============ CHANGE PASSWORD SCHEMA ============
  describe('changePasswordSchema', () => {
    it('should accept valid old and new passwords', () => {
      const { error } = changePasswordSchema.validate({
        oldPassword: 'oldpass123',
        newPassword: 'newpass123',
      });
      expect(error).toBeUndefined();
    });

    it('should reject new password shorter than 8 characters', () => {
      const { error } = changePasswordSchema.validate({
        oldPassword: 'oldpass123',
        newPassword: 'short',
      });
      expect(error).toBeDefined();
    });

    it('should reject missing oldPassword', () => {
      const { error } = changePasswordSchema.validate({
        newPassword: 'newpass123',
      });
      expect(error).toBeDefined();
    });
  });

  // ============ UPDATE PROFILE SCHEMA ============
  describe('updateProfileSchema', () => {
    it('should accept valid name', () => {
      const { error } = updateProfileSchema.validate({ name: 'John Doe' });
      expect(error).toBeUndefined();
    });

    it('should accept valid email', () => {
      const { error } = updateProfileSchema.validate({
        email: 'test@example.com',
      });
      expect(error).toBeUndefined();
    });

    it('should reject empty object (min 1 field required)', () => {
      const { error } = updateProfileSchema.validate({});
      expect(error).toBeDefined();
    });

    it('should reject name shorter than 3 characters', () => {
      const { error } = updateProfileSchema.validate({ name: 'AB' });
      expect(error).toBeDefined();
    });

    it('should reject invalid email format', () => {
      const { error } = updateProfileSchema.validate({
        email: 'not-an-email',
      });
      expect(error).toBeDefined();
    });
  });

  // ============ CREATE FUND APPLICATION SCHEMA ============
  describe('createFundApplicationSchema', () => {
    const validData = {
      purpose: 'Buy markers for class',
      category: 'competition',
      amount: 50000,
    };

    it('should accept valid fund application', () => {
      const { error } = createFundApplicationSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should accept all valid categories', () => {
      const categories = [
        'subscription',
        'consumption',
        'competition',
        'printing',
        'donation',
        'other',
      ];
      for (const category of categories) {
        const { error } = createFundApplicationSchema.validate({
          ...validData,
          category,
        });
        expect(error).toBeUndefined();
      }
    });

    it('should reject invalid category', () => {
      const { error } = createFundApplicationSchema.validate({
        ...validData,
        category: 'invalid_category',
      });
      expect(error).toBeDefined();
    });

    it('should reject negative amount', () => {
      const { error } = createFundApplicationSchema.validate({
        ...validData,
        amount: -100,
      });
      expect(error).toBeDefined();
    });

    it('should reject zero amount', () => {
      const { error } = createFundApplicationSchema.validate({
        ...validData,
        amount: 0,
      });
      expect(error).toBeDefined();
    });

    it('should reject missing purpose', () => {
      const { error } = createFundApplicationSchema.validate({
        category: 'competition',
        amount: 50000,
      });
      expect(error).toBeDefined();
    });
  });

  // ============ REJECT FUND APPLICATION SCHEMA ============
  describe('rejectFundApplicationSchema', () => {
    it('should accept valid rejection reason', () => {
      const { error } = rejectFundApplicationSchema.validate({
        rejectionReason: 'Budget exceeded',
      });
      expect(error).toBeUndefined();
    });

    it('should reject empty rejection reason', () => {
      const { error } = rejectFundApplicationSchema.validate({
        rejectionReason: '',
      });
      expect(error).toBeDefined();
    });

    it('should reject missing rejection reason', () => {
      const { error } = rejectFundApplicationSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  // ============ PAY BILL SCHEMA ============
  describe('payBillSchema', () => {
    it("should accept 'bank' payment method", () => {
      const { error } = payBillSchema.validate({ paymentMethod: 'bank' });
      expect(error).toBeUndefined();
    });

    it("should accept 'cash' payment method", () => {
      const { error } = payBillSchema.validate({ paymentMethod: 'cash' });
      expect(error).toBeUndefined();
    });

    it('should reject invalid payment method', () => {
      const { error } = payBillSchema.validate({ paymentMethod: 'crypto' });
      expect(error).toBeDefined();
    });

    it('should reject missing payment method', () => {
      const { error } = payBillSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  // ============ CREATE TRANSACTION SCHEMA ============
  describe('createTransactionSchema', () => {
    const validData = {
      date: new Date().toISOString(),
      description: 'Buying supplies',
      type: 'expense',
      amount: 25000,
    };

    it('should accept valid transaction', () => {
      const { error } = createTransactionSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should accept valid transaction with category', () => {
      const { error } = createTransactionSchema.validate({
        ...validData,
        category: 'office_supplies',
      });
      expect(error).toBeUndefined();
    });

    it("should accept 'income' type", () => {
      const { error } = createTransactionSchema.validate({
        ...validData,
        type: 'income',
      });
      expect(error).toBeUndefined();
    });

    it('should reject invalid type', () => {
      const { error } = createTransactionSchema.validate({
        ...validData,
        type: 'transfer',
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid category', () => {
      const { error } = createTransactionSchema.validate({
        ...validData,
        category: 'invalid',
      });
      expect(error).toBeDefined();
    });

    it('should reject description shorter than 3 characters', () => {
      const { error } = createTransactionSchema.validate({
        ...validData,
        description: 'AB',
      });
      expect(error).toBeDefined();
    });

    it('should reject missing required fields', () => {
      const { error } = createTransactionSchema.validate({});
      expect(error).toBeDefined();
    });

    it('should accept all valid categories', () => {
      const categories = [
        'kas_kelas',
        'donation',
        'fundraising',
        'office_supplies',
        'consumption',
        'event',
        'maintenance',
        'other',
      ];
      for (const category of categories) {
        const { error } = createTransactionSchema.validate({
          ...validData,
          category,
        });
        expect(error).toBeUndefined();
      }
    });
  });

  // ============ EXPORT TRANSACTION SCHEMA ============
  describe('exportTransactionSchema', () => {
    it('should accept valid xlsx format', () => {
      const { error } = exportTransactionSchema.validate({ format: 'xlsx' });
      expect(error).toBeUndefined();
    });

    it('should accept valid pdf format', () => {
      const { error } = exportTransactionSchema.validate({ format: 'pdf' });
      expect(error).toBeUndefined();
    });

    it('should reject invalid format', () => {
      const { error } = exportTransactionSchema.validate({ format: 'csv' });
      expect(error).toBeDefined();
    });

    it('should accept date range with format', () => {
      const { error } = exportTransactionSchema.validate({
        format: 'xlsx',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      expect(error).toBeUndefined();
    });

    it('should reject endDate before startDate', () => {
      const { error } = exportTransactionSchema.validate({
        format: 'xlsx',
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      });
      expect(error).toBeDefined();
    });
  });

  // ============ PAGINATION SCHEMA ============
  describe('paginationSchema', () => {
    it('should accept valid page and limit', () => {
      const { error, value } = paginationSchema.validate({
        page: 2,
        limit: 10,
      });
      expect(error).toBeUndefined();
      expect(value.page).toBe(2);
      expect(value.limit).toBe(10);
    });

    it('should apply defaults when empty', () => {
      const { error, value } = paginationSchema.validate({});
      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
    });

    it('should reject page less than 1', () => {
      const { error } = paginationSchema.validate({ page: 0 });
      expect(error).toBeDefined();
    });

    it('should reject limit greater than 100', () => {
      const { error } = paginationSchema.validate({ limit: 101 });
      expect(error).toBeDefined();
    });
  });

  // ============ DATE RANGE SCHEMA ============
  describe('dateRangeSchema', () => {
    it('should accept valid date range', () => {
      const { error } = dateRangeSchema.validate({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      expect(error).toBeUndefined();
    });

    it('should accept empty object (both optional)', () => {
      const { error } = dateRangeSchema.validate({});
      expect(error).toBeUndefined();
    });

    it('should reject endDate before startDate', () => {
      const { error } = dateRangeSchema.validate({
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      });
      expect(error).toBeDefined();
    });
  });

  // ============ TRANSACTION FILTER SCHEMA ============
  describe('transactionFilterSchema', () => {
    it('should accept valid filters', () => {
      const { error } = transactionFilterSchema.validate({
        page: 1,
        limit: 10,
        type: 'income',
        sortBy: 'date',
        sortOrder: 'desc',
      });
      expect(error).toBeUndefined();
    });

    it('should reject invalid sort field', () => {
      const { error } = transactionFilterSchema.validate({
        sortBy: 'invalid',
      });
      expect(error).toBeDefined();
    });
  });

  // ============ CASH BILL FILTER SCHEMA ============
  describe('cashBillFilterSchema', () => {
    it('should accept valid filters', () => {
      const { error } = cashBillFilterSchema.validate({
        status: 'belum_dibayar',
        year: 2024,
        sortBy: 'dueDate',
        sortOrder: 'asc',
      });
      expect(error).toBeUndefined();
    });

    it('should reject invalid status', () => {
      const { error } = cashBillFilterSchema.validate({
        status: 'invalid_status',
      });
      expect(error).toBeDefined();
    });

    it('should reject year out of range', () => {
      const { error } = cashBillFilterSchema.validate({ year: 2019 });
      expect(error).toBeDefined();
    });
  });
});
