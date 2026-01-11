import { cashBillService, fundApplicationService, transactionService } from "@/services";
import { asyncHandler } from "@/utils/errors";
import { Request, Response } from "express";

/**
 * Get dashboard summary
 * GET /api/dashboard/summary
 */
export const getSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const classId = req.user?.classId;
  const userRole = req.user?.role;
  const { startDate, endDate } = req.query;

  if (!classId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      },
    });
    return;
  }

  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;

  const summary = await transactionService.getDashboardSummary(classId, userRole, start, end);

  res.status(200).json({
    success: true,
    data: summary,
    message: "Summary fetched",
  });
});

/**
 * Get pending cash bills (unpaid and awaiting confirmation)
 * GET /api/dashboard/pending-bills
 */
export const getPendingBills = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      },
    });
    return;
  }

  const bills = await cashBillService.getPendingByUser(userId);

  res.status(200).json({
    success: true,
    data: bills,
    message: "Pending bills fetched",
  });
});

/**
 * Get pending fund applications
 * GET /api/dashboard/pending-applications
 */
export const getPendingApplications = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.sub;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        },
      });
      return;
    }

    const applications = await fundApplicationService.getPendingByUser(userId);

    res.status(200).json({
      success: true,
      data: applications,
      message: "Pending applications fetched",
    });
  }
);
