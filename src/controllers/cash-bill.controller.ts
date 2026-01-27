import { cashBillService } from "@/services";
import { asyncHandler } from "@/utils/errors";
import { Request, Response } from "express";

/**
 * Get user's cash bills
 * GET /api/cash-bills/my
 */
export const getMyBills = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  const { page = 1, limit = 10, status, search } = req.query;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User belum terautentikasi",
      },
    });
    return;
  }

  const statusFilter =
    typeof status === "string" ? status : Array.isArray(status) ? String(status[0]) : undefined;
  const searchQuery = typeof search === "string" ? search : undefined;

  const bills = await cashBillService.getMyBills(userId, {
    page: Number(page),
    limit: Number(limit),
    status: statusFilter,
    search: searchQuery,
  });

  res.status(200).json({
    success: true,
    data: bills,
    message: "Tagihan kas Anda berhasil diambil",
  });
});

/**
 * Get cash bill by ID
 * GET /api/cash-bills/:id
 */
export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.sub;

  const billId = Array.isArray(id) ? id[0] : id;

  const bill = await cashBillService.getBillById(billId, userId ?? "");

  res.status(200).json({
    success: true,
    data: bill,
    message: "Detail tagihan kas berhasil diambil",
  });
});

/**
 * Pay cash bill
 * POST /api/cash-bills/:id/pay
 */
export const pay = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  const { id } = req.params;
  const { paymentMethod, paymentAccountId } = req.body;
  const paymentProofUrl = req.fileUrl;

  const billId = Array.isArray(id) ? id[0] : id;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User belum terautentikasi",
      },
    });
    return;
  }

  if (!paymentProofUrl) {
    res.status(400).json({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "Bukti pembayaran wajib diupload",
      },
    });
    return;
  }

  const result = await cashBillService.payBill(
    billId,
    userId,
    paymentMethod,
    paymentProofUrl,
    paymentAccountId
  );

  res.status(200).json({
    success: true,
    data: result,
    message: "Pembayaran tagihan berhasil",
  });
});

/**
 * Cancel payment for cash bill
 * POST /api/cash-bills/:id/cancel-payment
 */
export const cancelPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  const { id } = req.params;

  const billId = Array.isArray(id) ? id[0] : id;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User belum terautentikasi",
      },
    });
    return;
  }

  const result = await cashBillService.cancelPayment(billId, userId);

  res.status(200).json({
    success: true,
    data: result,
    message: "Pembayaran berhasil dibatalkan",
  });
});
