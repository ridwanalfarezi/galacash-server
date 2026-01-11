import { paymentAccountService } from "@/services/payment-account.service";
import { successResponse } from "@/utils/response";
import { NextFunction, Request, Response } from "express";

export class PaymentAccountController {
  /**
   * Get all payment accounts (bendahara only)
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, accountType, search } = req.query;

      const accounts = await paymentAccountService.getAll({
        status: status as "active" | "inactive" | undefined,
        accountType: accountType as "bank" | "ewallet" | undefined,
        search: search as string | undefined,
      });

      res.json(successResponse(accounts, "Payment accounts retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active payment accounts (public for users)
   */
  async getActive(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accounts = await paymentAccountService.getActive();
      res.json(successResponse(accounts, "Active payment accounts retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment account by ID
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const accountId = Array.isArray(id) ? id[0] : id;
      const account = await paymentAccountService.getById(accountId);
      res.json(successResponse(account, "Payment account retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new payment account (bendahara only)
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await paymentAccountService.create(req.body);
      res.status(201).json(successResponse(account, "Payment account created successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update payment account (bendahara only)
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const accountId = Array.isArray(id) ? id[0] : id;
      const account = await paymentAccountService.update(accountId, req.body);
      res.json(successResponse(account, "Payment account updated successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete payment account (bendahara only)
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const accountId = Array.isArray(id) ? id[0] : id;
      await paymentAccountService.delete(accountId);
      res.json(successResponse(null, "Payment account deleted successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activate payment account (bendahara only)
   */
  async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const accountId = Array.isArray(id) ? id[0] : id;
      const account = await paymentAccountService.activate(accountId);
      res.json(successResponse(account, "Payment account activated successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate payment account (bendahara only)
   */
  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const accountId = Array.isArray(id) ? id[0] : id;
      const account = await paymentAccountService.deactivate(accountId);
      res.json(successResponse(account, "Payment account deactivated successfully"));
    } catch (error) {
      next(error);
    }
  }
}

export const paymentAccountController = new PaymentAccountController();
