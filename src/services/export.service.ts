import { TransactionType } from "@/prisma/generated/client";
import { transactionRepository } from "@/repositories/transaction.repository";
import ExcelJS from "exceljs";

export interface ExportFilters {
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
      { header: "Tanggal", key: "date", width: 15 },
      { header: "Tipe", key: "type", width: 15 },
      { header: "Kategori", key: "category", width: 20 },
      { header: "Keperluan", key: "description", width: 40 },
      { header: "Nominal", key: "amount", width: 15 },
      { header: "Lampiran", key: "attachment", width: 40 },
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
        date: new Date(transaction.date).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
        type: transaction.type === "income" ? "Pemasukan" : "Pengeluaran",
        category: this.formatCategory(transaction.category),
        description: transaction.description,
        amount: transaction.amount,
        attachment: transaction.attachmentUrl || "-",
      });
    });

    // Format amount column as currency
    worksheet.getColumn("amount").numFmt = '"Rp"#,##0.00';
    // Align attachment column to left (default is usually left but good to valid)
    worksheet.getColumn("attachment").alignment = { vertical: "middle", wrapText: true };

    // Add totals row
    // Calculate totals manually or using formula
    // Let's add specific summary block at bottom like rekap kas

    const lastRow = worksheet.rowCount + 2; // leave 1 empty row

    // Total Income
    worksheet.getCell(`A${lastRow}`).value = "Total Pemasukan";
    worksheet.getCell(`A${lastRow}`).font = { bold: true };
    worksheet.getCell(`E${lastRow}`).value = {
      formula: `SUMIF(B2:B${lastRow - 2}, "Pemasukan", E2:E${lastRow - 2})`,
    };
    worksheet.getCell(`E${lastRow}`).numFmt = '"Rp"#,##0.00';

    // Total Expense
    worksheet.getCell(`A${lastRow + 1}`).value = "Total Pengeluaran";
    worksheet.getCell(`A${lastRow + 1}`).font = { bold: true };
    worksheet.getCell(`E${lastRow + 1}`).value = {
      formula: `SUMIF(B2:B${lastRow - 2}, "Pengeluaran", E2:E${lastRow - 2})`,
    };
    worksheet.getCell(`E${lastRow + 1}`).numFmt = '"Rp"#,##0.00';

    // Balance
    worksheet.getCell(`A${lastRow + 2}`).value = "Sisa Saldo";
    worksheet.getCell(`A${lastRow + 2}`).font = { bold: true };
    worksheet.getCell(`E${lastRow + 2}`).value = {
      formula: `E${lastRow} - E${lastRow + 1}`,
    };
    worksheet.getCell(`E${lastRow + 2}`).numFmt = '"Rp"#,##0.00';
    worksheet.getCell(`E${lastRow + 2}`).font = { bold: true };

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
      type: filters.type,
      category: filters.category,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      page: 1,
      limit: 10000, // Export all (with reasonable limit)
    });

    // CSV header
    const headers = ["Tanggal", "Tipe", "Kategori", "Keperluan", "Nominal", "Lampiran"];
    const rows = [headers.join(",")];

    let totalIncome = 0;
    let totalExpense = 0;

    // Add data rows
    transactions.data.forEach((transaction) => {
      const amount = Number(transaction.amount);
      if (transaction.type === "income") totalIncome += amount;
      else totalExpense += amount;

      const row = [
        new Date(transaction.date).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
        transaction.type === "income" ? "Pemasukan" : "Pengeluaran",
        this.formatCategory(transaction.category),
        `"${transaction.description.replace(/"/g, '""')}"`, // Escape quotes
        amount.toString(),
        `"${transaction.attachmentUrl || "-"}"`,
      ];
      rows.push(row.join(","));
    });

    // Add totals row
    rows.push(``); // Empty line
    rows.push(`"Total Pemasukan",,,,${totalIncome},`);
    rows.push(`"Total Pengeluaran",,,,${totalExpense},`);
    rows.push(`"Sisa Saldo",,,,${totalIncome - totalExpense},`);

    return rows.join("\n");
  }

  /**
   * Format category enum to readable text
   */
  private formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      kas_kelas: "Kas Kelas",
      donation: "Sumbangan",
      fundraising: "Fundraising",
      office_supplies: "Alat Tulis Kantor",
      consumption: "Konsumsi",
      event: "Acara",
      maintenance: "Pemeliharaan",
      other: "Lainnya",
      education: "Pendidikan",
      health: "Kesehatan",
      emergency: "Darurat",
      equipment: "Peralatan",
      subscription: "Langganan",
      competition: "Lomba",
      printing: "Cetak",
      fine: "Denda",
      transport: "Transportasi",
      social: "Sosial",
    };

    return categoryMap[category] || category;
  }
  /**
   * Export Rekap Kas to Excel with Multi-sheet support
   */
  async exportRekapKasToExcel(data: import("./bendahara.service").RekapKasData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // SHEET 1: RINGKASAN & TRANSAKSI
    const summarySheet = workbook.addWorksheet("Ringkasan & Transaksi");

    // Title
    summarySheet.mergeCells("A1:E1");
    summarySheet.getCell("A1").value = "LAPORAN KAS KELAS";
    summarySheet.getCell("A1").font = {
      bold: true,
      size: 16,
      color: { argb: "FF4472C4" },
    };
    summarySheet.getCell("A1").alignment = { horizontal: "center" };

    // Period
    summarySheet.mergeCells("A2:E2");
    summarySheet.getCell("A2").value = `Periode: ${new Date(
      data.period.startDate
    ).toLocaleDateString("id-ID")} - ${new Date(data.period.endDate).toLocaleDateString("id-ID")}`;
    summarySheet.getCell("A2").alignment = { horizontal: "center" };

    // Financial Summary Table
    summarySheet.getCell("A4").value = "RINGKASAN KEUANGAN";
    summarySheet.getCell("A4").font = { bold: true };

    const summaryRows = [
      ["Total Pemasukan", data.summary.totalIncome],
      ["Total Pengeluaran", data.summary.totalExpense],
      ["Saldo Akhir", data.summary.balance],
    ];

    summaryRows.forEach((row, index) => {
      const r = 5 + index;
      summarySheet.getCell(`A${r}`).value = row[0];
      summarySheet.getCell(`B${r}`).value = row[1];
      summarySheet.getCell(`B${r}`).numFmt = '"Rp"#,##0';
      if (index === 2) summarySheet.getCell(`B${r}`).font = { bold: true };
    });

    // Transactions Table
    summarySheet.getCell("A9").value = "RIWAYAT TRANSAKSI";
    summarySheet.getCell("A9").font = { bold: true };

    // Headers
    const transHeaders = ["Tanggal", "Tipe", "Kategori", "Keterangan", "Jumlah"];
    const headerRow = summarySheet.getRow(10);
    transHeaders.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
    });

    // Transaction Data
    data.transactions.forEach((t, i) => {
      const r = 11 + i;
      const row = summarySheet.getRow(r);
      row.getCell(1).value = new Date(t.date).toLocaleDateString("id-ID");
      row.getCell(2).value = t.type === "income" ? "Pemasukan" : "Pengeluaran";
      row.getCell(3).value = this.formatCategory(t.category);
      row.getCell(4).value = t.description;
      row.getCell(5).value = Number(t.amount);
      row.getCell(5).numFmt = '"Rp"#,##0';
    });

    // Auto-width columns
    [15, 12, 18, 40, 15].forEach((w, i) => {
      summarySheet.getColumn(i + 1).width = w;
    });

    // SHEET 2: STATUS SISWA
    const studentSheet = workbook.addWorksheet("Status Siswa");

    studentSheet.columns = [
      { header: "Nama", key: "name", width: 25 },
      { header: "NIM", key: "nim", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Total Dibayar", key: "paid", width: 18 },
      { header: "Total Tunggakan", key: "unpaid", width: 18 },
      { header: "Rincian Bulan", key: "months", width: 50 },
    ];

    // Header Style
    studentSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    studentSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };

    data.students.forEach((s) => {
      // Format months details
      // Group by status
      const paidMonths = s.bills
        .filter((b) => b.status === "sudah_dibayar")
        .map((b) => `${this.getMonthName(b.month)} ${b.year}`)
        .join(", ");

      const unpaidMonths = s.bills
        .filter((b) => b.status !== "sudah_dibayar")
        .map((b) => `${this.getMonthName(b.month)} ${b.year} (Unpaid)`)
        .join(", ");

      const details = [
        unpaidMonths ? `TUNGGAKAN: ${unpaidMonths}` : "",
        paidMonths ? `LUNAS: ${paidMonths}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      studentSheet.addRow({
        name: s.name,
        nim: s.nim,
        status: s.paymentStatus === "up-to-date" ? "Lunas" : "Menunggak",
        paid: s.totalPaid,
        unpaid: s.totalUnpaid,
        months: details,
      });
    });

    // Format currency columns
    studentSheet.getColumn("paid").numFmt = '"Rp"#,##0';
    studentSheet.getColumn("unpaid").numFmt = '"Rp"#,##0';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private getMonthName(month: number): string {
    const months = [
      "Jan",
      "feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    return months[month - 1] || String(month);
  }
}

export const exportService = new ExportService();
