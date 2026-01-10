import { transactionService } from "@/services";
import { asyncHandler } from "@/utils/errors";
import { Request, Response } from "express";

/**
 * Get transactions list
 * GET /api/transactions
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const classId = req.user?.classId;
  const { page = 1, limit = 10, type } = req.query;

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

  const typeFilter =
    typeof type === "string" ? type : Array.isArray(type) ? String(type[0]) : undefined;

  const transactions = await transactionService.getTransactions(classId, {
    page: Number(page),
    limit: Number(limit),
    type: typeFilter,
  });

  res.status(200).json({
    success: true,
    data: transactions,
    message: "Transactions fetched",
  });
});

/**
 * Get transaction by ID
 * GET /api/transactions/:id
 */
export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const transactionId = Array.isArray(id) ? id[0] : id;

  const transaction = await transactionService.getTransactionById(transactionId);

  res.status(200).json({
    success: true,
    data: transaction,
    message: "Transaction fetched",
  });
});

/**
 * Get transaction chart data
 * GET /api/transactions/chart/data
 */
export const getChartData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const classId = req.user?.classId;
  const { type } = req.query;

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

  const chartType =
    typeof type === "string"
      ? (type as "income" | "expense")
      : Array.isArray(type)
        ? (type[0] as "income" | "expense")
        : undefined;

  const chartData = await transactionService.getChartData(classId, chartType ?? "income");

  res.status(200).json({
    success: true,
    data: chartData,
    message: "Chart data fetched",
  });
});
