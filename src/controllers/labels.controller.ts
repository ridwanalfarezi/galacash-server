import { successResponse } from "@/utils/response";
import {
  getAllAccountStatusLabels,
  getAllAccountTypeLabels,
  getAllBillStatusLabels,
  getAllFundCategoryLabels,
  getAllFundStatusLabels,
  getAllPaymentMethodLabels,
  getAllTransactionCategoryLabels,
  getAllTransactionTypeLabels,
} from "@/utils/status-labels";
import { NextFunction, Request, Response } from "express";

export class LabelsController {
  /**
   * Get all status labels
   * GET /api/labels
   */
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labels = {
        billStatuses: getAllBillStatusLabels(),
        fundStatuses: getAllFundStatusLabels(),
        fundCategories: getAllFundCategoryLabels(),
        transactionTypes: getAllTransactionTypeLabels(),
        transactionCategories: getAllTransactionCategoryLabels(),
        paymentMethods: getAllPaymentMethodLabels(),
        accountTypes: getAllAccountTypeLabels(),
        accountStatuses: getAllAccountStatusLabels(),
      };

      res.json(successResponse(labels, "Semua label berhasil diambil"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get bill status labels
   * GET /api/labels/bill-statuses
   */
  async getBillStatuses(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labels = getAllBillStatusLabels();
      res.json(successResponse(labels, "Label status tagihan berhasil diambil"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get fund status labels
   * GET /api/labels/fund-statuses
   */
  async getFundStatuses(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labels = getAllFundStatusLabels();
      res.json(successResponse(labels, "Label status pengajuan dana berhasil diambil"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get fund category labels
   * GET /api/labels/fund-categories
   */
  async getFundCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labels = getAllFundCategoryLabels();
      res.json(successResponse(labels, "Label kategori pengajuan dana berhasil diambil"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction type labels
   * GET /api/labels/transaction-types
   */
  async getTransactionTypes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labels = getAllTransactionTypeLabels();
      res.json(successResponse(labels, "Label tipe transaksi berhasil diambil"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction category labels
   * GET /api/labels/transaction-categories
   */
  async getTransactionCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labels = getAllTransactionCategoryLabels();
      res.json(successResponse(labels, "Label kategori transaksi berhasil diambil"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment method labels
   * GET /api/labels/payment-methods
   */
  async getPaymentMethods(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labels = getAllPaymentMethodLabels();
      res.json(successResponse(labels, "Label metode pembayaran berhasil diambil"));
    } catch (error) {
      next(error);
    }
  }
}

export const labelsController = new LabelsController();
