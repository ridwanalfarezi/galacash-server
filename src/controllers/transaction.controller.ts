import { transactionService } from "@/services";
import { asyncHandler } from "@/utils/errors";
import { Request, Response } from "express";

/**
 * Get transactions list
 * GET /api/transactions
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 10, type } = req.query;

  const typeFilter =
    typeof type === "string" ? type : Array.isArray(type) ? String(type[0]) : undefined;

  const transactions = await transactionService.getTransactions({
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
  const { type } = req.query;

  const chartType =
    typeof type === "string"
      ? (type as "income" | "expense")
      : Array.isArray(type)
        ? (type[0] as "income" | "expense")
        : undefined;

  const chartData = await transactionService.getChartData(chartType ?? "income");

  res.status(200).json({
    success: true,
    data: chartData,
    message: "Chart data fetched",
  });
});

/**
 * Get transaction breakdown by category
 * GET /api/transactions/breakdown
 */
export const getBreakdown = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type, startDate, endDate } = req.query;

  const chartType =
    typeof type === "string"
      ? (type as "income" | "expense")
      : Array.isArray(type)
        ? (type[0] as "income" | "expense")
        : "income";

  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;

  const breakdown = await transactionService.getBreakdown(chartType, start, end);

  res.status(200).json({
    success: true,
    data: breakdown,
    message: "Transaction breakdown fetched",
  });
});

/**
 * Export transactions
 * GET /api/transactions/export
 */
export const exportTransactions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { format, type, category, startDate, endDate, search } = req.query;

    const { exportService } = await import("@/services/export.service");

    const filters = {
      type: type ? (type as "income" | "expense") : undefined,
      category: category as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      search: search as string | undefined,
    };

    const exportFormat = (format as string) || "excel";

    if (exportFormat === "csv") {
      const csvData = await exportService.exportTransactionsToCSV(filters);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="transactions.csv"');
      res.send(csvData);
    } else {
      const excelBuffer = await exportService.exportTransactionsToExcel(filters);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", 'attachment; filename="transactions.xlsx"');
      res.send(excelBuffer);
    }
  }
);
