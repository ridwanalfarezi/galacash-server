import { bendaharaService, userService } from "@/services";
import { asyncHandler } from "@/utils/errors";
import { Request, Response } from "express";

/**
 * Get bendahara dashboard
 * GET /api/bendahara/dashboard
 */
export const getDashboard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user;

  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      },
    });
    return;
  }

  const dashboard = await bendaharaService.getDashboard();

  res.status(200).json({
    success: true,
    data: dashboard,
    message: "Dashboard fetched",
  });
});

/**
 * Get all fund applications
 * GET /api/bendahara/fund-applications
 */
/**
 * Approve fund application
 * POST /api/bendahara/fund-applications/:id/approve
 */
export const approveFundApplication = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const bendaharaId = req.user?.sub;
    const { id } = req.params;
    const applicationId = Array.isArray(id) ? id[0] : id;

    if (!bendaharaId) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        },
      });
      return;
    }

    const application = await bendaharaService.approveFundApplication(applicationId, bendaharaId);

    res.status(200).json({
      success: true,
      data: application,
      message: "Fund application approved",
    });
  }
);

/**
 * Reject fund application
 * POST /api/bendahara/fund-applications/:id/reject
 */
export const rejectFundApplication = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const bendaharaId = req.user?.sub;
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const applicationId = Array.isArray(id) ? id[0] : id;

    if (!bendaharaId) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        },
      });
      return;
    }

    const application = await bendaharaService.rejectFundApplication(
      applicationId,
      bendaharaId,
      rejectionReason
    );

    res.status(200).json({
      success: true,
      data: application,
      message: "Fund application rejected",
    });
  }
);

/**
 * Get all cash bills
 * GET /api/bendahara/cash-bills
 */
export const getAllCashBills = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const { page = 1, limit = 10, status } = req.query;

  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "User not authenticated" },
    });
    return;
  }

  const statusFilter =
    typeof status === "string" ? status : Array.isArray(status) ? String(status[0]) : undefined;

  const bills = await bendaharaService.getAllCashBills({
    page: Number(page),
    limit: Number(limit),
    status: statusFilter,
  });

  res.status(200).json({
    success: true,
    data: bills,
    message: "All cash bills fetched",
  });
});

/**
 * Confirm payment for cash bill
 * POST /api/bendahara/cash-bills/:id/confirm-payment
 */
export const confirmPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const bendaharaId = req.user?.sub;
  const { id } = req.params;
  const billId = Array.isArray(id) ? id[0] : id;

  if (!bendaharaId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      },
    });
    return;
  }

  const bill = await bendaharaService.confirmPayment(billId, bendaharaId);

  res.status(200).json({
    success: true,
    data: bill,
    message: "Payment confirmed",
  });
});

/**
 * Reject payment for cash bill
 * POST /api/bendahara/cash-bills/:id/reject-payment
 */
export const rejectPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const bendaharaId = req.user?.sub;
  const { id } = req.params;
  const { reason } = req.body;
  const billId = Array.isArray(id) ? id[0] : id;

  if (!bendaharaId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      },
    });
    return;
  }

  const bill = await bendaharaService.rejectPayment(billId, reason);

  res.status(200).json({
    success: true,
    data: bill,
    message: "Payment rejected",
  });
});

/**
 * Get rekap kas (cash report)
 * GET /api/bendahara/rekap-kas
 */
export const getRekapKas = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const { startDate, endDate } = req.query;

  if (!user) {
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

  const rekapKas = await bendaharaService.getRekapKas(start, end);

  res.status(200).json({
    success: true,
    data: rekapKas,
    message: "Rekap kas fetched",
  });
});

/**
 * Get all students
 * GET /api/bendahara/students
 */
export const getStudents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const { page = 1, limit = 10, search } = req.query;

  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "User not authenticated" },
    });
    return;
  }

  const students = await userService.getStudents({
    classId: user.classId,
    page: Number(page),
    limit: Number(limit),
    search: search as string | undefined,
  });

  res.status(200).json({
    success: true,
    data: students,
    message: "Students fetched",
  });
});

/**
 * Create manual transaction
 * POST /api/bendahara/transactions
 */
export const createTransaction = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    const { date, description, type, amount, category } = req.body;
    const attachment = req.fileUrl; // Set by upload middleware

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        },
      });
      return;
    }

    const transaction = await bendaharaService.createManualTransaction({
      date: new Date(date),
      description,
      type,
      amount: Number(amount),
      category,
      attachment,
      createdBy: user.sub,
      classId: user.classId,
    });

    res.status(201).json({
      success: true,
      data: transaction,
      message: "Transaction created successfully",
    });
  }
);
