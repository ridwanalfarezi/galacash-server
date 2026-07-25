import { cashBillService } from '../services/index.js';
import { asyncHandler } from '../utils/errors/index.js';
import { Request, Response } from 'express';

export const getMyBills = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { page = 1, limit = 10, status, search } = req.query;

  const statusFilter =
    typeof status === 'string' ? status : Array.isArray(status) ? String(status[0]) : undefined;
  const searchQuery = typeof search === 'string' ? search : undefined;

  const bills = await cashBillService.getMyBills(userId, {
    page: Number(page),
    limit: Number(limit),
    status: statusFilter,
    search: searchQuery,
  });

  res.status(200).json({
    success: true,
    data: bills,
    message: 'Tagihan kas Anda berhasil diambil',
  });
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.sub;

  const billId = Array.isArray(id) ? id[0] : id;

  const bill = await cashBillService.getBillById(billId, userId);

  res.status(200).json({
    success: true,
    data: bill,
    message: 'Detail tagihan kas berhasil diambil',
  });
});

export const pay = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { id } = req.params;
  const { paymentMethod, paymentAccountId } = req.body;
  const paymentProofUrl = req.fileUrl;

  const billId = Array.isArray(id) ? id[0] : id;

  if (!paymentProofUrl) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Bukti pembayaran wajib diupload',
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
    message: 'Pembayaran tagihan berhasil',
  });
});

export const cancelPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { id } = req.params;

  const billId = Array.isArray(id) ? id[0] : id;

  const result = await cashBillService.cancelPayment(billId, userId);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Pembayaran berhasil dibatalkan',
  });
});

export const batchPay = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { paymentMethod } = req.body;
  const paymentProofUrl = req.fileUrl;

  // billIds can arrive as JSON string (multipart/form-data) or as array (application/json)
  let billIds: unknown = req.body.billIds;
  if (typeof billIds === 'string') {
    try {
      billIds = JSON.parse(billIds);
    } catch {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'billIds harus berupa JSON array yang valid',
        },
      });
      return;
    }
  }

  if (!paymentProofUrl && paymentMethod !== 'cash') {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Bukti pembayaran wajib diupload',
      },
    });
    return;
  }

  if (
    !Array.isArray(billIds) ||
    billIds.length === 0 ||
    !billIds.every((billId) => typeof billId === 'string' && billId.trim().length > 0)
  ) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'billIds harus berupa array string valid dan tidak boleh kosong',
      },
    });
    return;
  }

  const result = await cashBillService.payBillsBatch(
    billIds,
    userId,
    paymentMethod,
    paymentProofUrl || null
  );

  res.status(200).json({
    success: true,
    data: result,
    message: `${result.length} tagihan berhasil dibayar`,
  });
});
