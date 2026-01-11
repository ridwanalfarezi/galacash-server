import { transactionRepository } from "@/repositories/transaction.repository";
import { TransactionType } from "@prisma/client";
import ExcelJS from "exceljs";

export interface ExportFilters {
  classId: string;
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  category?: string;
  search?: string;
}

export class ExportService {
  /**
   * Export transactions to Excel format
   */
  async exportTransactionsToExcel(filters: ExportFilters): Promise<Buffer> {
    // Fetch transactions from repository
    const transactions = await transactionRepository.findAll({
      classId: filters.classId,
      type: filters.type,
      category: filters.category,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      page: 1,
      limit: 10000, // Export all (with reasonable limit)
    });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Transactions");

    // Set column headers
    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Type", key: "type", width: 12 },
      { header: "Category", key: "category", width: 18 },
      { header: "Description", key: "description", width: 40 },
      { header: "Amount", key: "amount", width: 15 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add data rows
    transactions.data.forEach((transaction) => {
      worksheet.addRow({
        date: new Date(transaction.date).toLocaleDateString("id-ID"),
        type: transaction.type === "income" ? "Income" : "Expense",
        category: this.formatCategory(transaction.category),
        description: transaction.description,
        amount: transaction.amount,
      });
    });

    // Format amount column as currency
    worksheet.getColumn("amount").numFmt = '"Rp"#,##0.00';

    // Add totals row
    const lastRow = worksheet.rowCount + 1;
    worksheet.getCell(`A${lastRow}`).value = "TOTAL";
    worksheet.getCell(`A${lastRow}`).font = { bold: true };
    worksheet.getCell(`E${lastRow}`).value = {
      formula: `SUM(E2:E${lastRow - 1})`,
    };
    worksheet.getCell(`E${lastRow}`).font = { bold: true };
    worksheet.getCell(`E${lastRow}`).numFmt = '"Rp"#,##0.00';

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export transactions to CSV format
   */
  async exportTransactionsToCSV(filters: ExportFilters): Promise<string> {
    // Fetch transactions from repository
    const transactions = await transactionRepository.findAll({
      classId: filters.classId,
      type: filters.type,
      category: filters.category,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      page: 1,
      limit: 10000, // Export all (with reasonable limit)
    });

    // CSV header
    const headers = ["Date", "Type", "Category", "Description", "Amount"];
    const rows = [headers.join(",")];

    // Add data rows
    transactions.data.forEach((transaction) => {
      const row = [
        new Date(transaction.date).toLocaleDateString("id-ID"),
        transaction.type === "income" ? "Income" : "Expense",
        this.formatCategory(transaction.category),
        `"${transaction.description.replace(/"/g, '""')}"`, // Escape quotes
        transaction.amount.toString(),
      ];
      rows.push(row.join(","));
    });

    // Add totals row
    const totalAmount = transactions.data.reduce((sum, t) => sum + t.amount, 0);
    rows.push(`"TOTAL",,,,${totalAmount}`);

    return rows.join("\n");
  }

  /**
   * Format category enum to readable text
   */
  private formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      kas_kelas: "Class Cash",
      donation: "Donation",
      fundraising: "Fundraising",
      office_supplies: "Office Supplies",
      consumption: "Consumption",
      event: "Event",
      maintenance: "Maintenance",
      other: "Other",
    };

    return categoryMap[category] || category;
  }
}

export const exportService = new ExportService();
