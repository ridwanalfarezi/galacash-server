import { cashBillService, fundApplicationService, transactionService } from '@/services';
import { asyncHandler } from '@/utils/errors';
import { Request, Response } from 'express';

export const getSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;

  const summary = await transactionService.getDashboardSummary(start, end);

  res.status(200).json({
    success: true,
    data: summary,
    message: 'Ringkasan berhasil diambil',
  });
});

export const getPendingBills = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  const bills = await cashBillService.getPendingByUser(userId);

  res.status(200).json({
    success: true,
    data: bills,
    message: 'Tagihan tertunda berhasil diambil',
  });
});

export const getPendingApplications = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;

    const applications = await fundApplicationService.getPendingByUser(userId);

    res.status(200).json({
      success: true,
      data: applications,
      message: 'Pengajuan tertunda berhasil diambil',
    });
  }
);
