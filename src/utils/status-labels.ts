import { BillStatus, FundStatus } from "@/prisma/generated/client";

/**
 * Status label configuration
 */
export interface StatusLabel {
  value: string;
  label: string;
  labelId: string; // Indonesian
  color: string;
  badgeVariant: "default" | "secondary" | "success" | "warning" | "danger" | "info";
}

/**
 * Cash Bill Status Labels
 */
export const BILL_STATUS_LABELS: Record<BillStatus, StatusLabel> = {
  belum_dibayar: {
    value: "belum_dibayar",
    label: "Unpaid",
    labelId: "Belum Dibayar",
    color: "#EF4444", // red
    badgeVariant: "danger",
  },
  menunggu_konfirmasi: {
    value: "menunggu_konfirmasi",
    label: "Pending Confirmation",
    labelId: "Menunggu Konfirmasi",
    color: "#F59E0B", // amber
    badgeVariant: "warning",
  },
  sudah_dibayar: {
    value: "sudah_dibayar",
    label: "Paid",
    labelId: "Sudah Dibayar",
    color: "#10B981", // green
    badgeVariant: "success",
  },
};

/**
 * Fund Application Status Labels
 */
export const FUND_STATUS_LABELS: Record<FundStatus, StatusLabel> = {
  pending: {
    value: "pending",
    label: "Pending Review",
    labelId: "Menunggu Review",
    color: "#F59E0B", // amber
    badgeVariant: "warning",
  },
  approved: {
    value: "approved",
    label: "Approved",
    labelId: "Disetujui",
    color: "#10B981", // green
    badgeVariant: "success",
  },
  rejected: {
    value: "rejected",
    label: "Rejected",
    labelId: "Ditolak",
    color: "#EF4444", // red
    badgeVariant: "danger",
  },
};

/**
 * Transaction Type Labels
 */
export const TRANSACTION_TYPE_LABELS = {
  income: {
    value: "income",
    label: "Income",
    labelId: "Pemasukan",
    color: "#10B981", // green
    badgeVariant: "success" as const,
  },
  expense: {
    value: "expense",
    label: "Expense",
    labelId: "Pengeluaran",
    color: "#EF4444", // red
    badgeVariant: "danger" as const,
  },
};

/**
 * Transaction Category Labels
 */
export const TRANSACTION_CATEGORY_LABELS = {
  // Income categories
  kas_kelas: {
    value: "kas_kelas",
    label: "Class Cash",
    labelId: "Kas Kelas",
    color: "#3B82F6", // blue
    badgeVariant: "info" as const,
  },
  donation: {
    value: "donation",
    label: "Donation",
    labelId: "Donasi",
    color: "#8B5CF6", // purple
    badgeVariant: "secondary" as const,
  },
  fundraising: {
    value: "fundraising",
    label: "Fundraising",
    labelId: "Penggalangan Dana",
    color: "#06B6D4", // cyan
    badgeVariant: "info" as const,
  },
  // Expense categories
  office_supplies: {
    value: "office_supplies",
    label: "Office Supplies",
    labelId: "Perlengkapan Kantor",
    color: "#F59E0B", // amber
    badgeVariant: "warning" as const,
  },
  consumption: {
    value: "consumption",
    label: "Consumption",
    labelId: "Konsumsi",
    color: "#EC4899", // pink
    badgeVariant: "secondary" as const,
  },
  event: {
    value: "event",
    label: "Event",
    labelId: "Acara",
    color: "#8B5CF6", // purple
    badgeVariant: "secondary" as const,
  },
  maintenance: {
    value: "maintenance",
    label: "Maintenance",
    labelId: "Pemeliharaan",
    color: "#6366F1", // indigo
    badgeVariant: "info" as const,
  },
  other: {
    value: "other",
    label: "Other",
    labelId: "Lainnya",
    color: "#6B7280", // gray
    badgeVariant: "default" as const,
  },
};

/**
 * Payment Method Labels
 */
export const PAYMENT_METHOD_LABELS = {
  bank: {
    value: "bank",
    label: "Bank Transfer",
    labelId: "Transfer Bank",
    color: "#3B82F6", // blue
    badgeVariant: "info" as const,
  },
  ewallet: {
    value: "ewallet",
    label: "E-Wallet",
    labelId: "E-Wallet",
    color: "#8B5CF6", // purple
    badgeVariant: "secondary" as const,
  },
  cash: {
    value: "cash",
    label: "Cash",
    labelId: "Tunai",
    color: "#10B981", // green
    badgeVariant: "success" as const,
  },
};

/**
 * Fund Category Labels
 */
export const FUND_CATEGORY_LABELS = {
  education: {
    value: "education",
    label: "Education",
    labelId: "Pendidikan",
    color: "#3B82F6", // blue
    badgeVariant: "info" as const,
  },
  health: {
    value: "health",
    label: "Health",
    labelId: "Kesehatan",
    color: "#EF4444", // red
    badgeVariant: "danger" as const,
  },
  emergency: {
    value: "emergency",
    label: "Emergency",
    labelId: "Darurat",
    color: "#F59E0B", // amber
    badgeVariant: "warning" as const,
  },
  equipment: {
    value: "equipment",
    label: "Equipment",
    labelId: "Perlengkapan",
    color: "#8B5CF6", // purple
    badgeVariant: "secondary" as const,
  },
};

/**
 * Account Type Labels
 */
export const ACCOUNT_TYPE_LABELS = {
  bank: {
    value: "bank",
    label: "Bank Account",
    labelId: "Rekening Bank",
    color: "#3B82F6", // blue
    badgeVariant: "info" as const,
  },
  ewallet: {
    value: "ewallet",
    label: "E-Wallet",
    labelId: "E-Wallet",
    color: "#8B5CF6", // purple
    badgeVariant: "secondary" as const,
  },
};

/**
 * Account Status Labels
 */
export const ACCOUNT_STATUS_LABELS = {
  active: {
    value: "active",
    label: "Active",
    labelId: "Aktif",
    color: "#10B981", // green
    badgeVariant: "success" as const,
  },
  inactive: {
    value: "inactive",
    label: "Inactive",
    labelId: "Nonaktif",
    color: "#6B7280", // gray
    badgeVariant: "default" as const,
  },
};

/**
 * Helper functions to get status labels
 */

export const getBillStatusLabel = (status: BillStatus): StatusLabel => {
  return BILL_STATUS_LABELS[status];
};

export const getFundStatusLabel = (status: FundStatus): StatusLabel => {
  return FUND_STATUS_LABELS[status];
};

export const getTransactionTypeLabel = (type: "income" | "expense") => {
  return TRANSACTION_TYPE_LABELS[type];
};

export const getTransactionCategoryLabel = (category: string) => {
  return (
    TRANSACTION_CATEGORY_LABELS[category as keyof typeof TRANSACTION_CATEGORY_LABELS] ||
    TRANSACTION_CATEGORY_LABELS.other
  );
};

export const getPaymentMethodLabel = (method: string) => {
  return (
    PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ||
    PAYMENT_METHOD_LABELS.cash
  );
};

export const getFundCategoryLabel = (category: string) => {
  return (
    FUND_CATEGORY_LABELS[category as keyof typeof FUND_CATEGORY_LABELS] ||
    FUND_CATEGORY_LABELS.education
  );
};

export const getAccountTypeLabel = (type: string) => {
  return ACCOUNT_TYPE_LABELS[type as keyof typeof ACCOUNT_TYPE_LABELS] || ACCOUNT_TYPE_LABELS.bank;
};

export const getAccountStatusLabel = (status: string) => {
  return (
    ACCOUNT_STATUS_LABELS[status as keyof typeof ACCOUNT_STATUS_LABELS] ||
    ACCOUNT_STATUS_LABELS.active
  );
};

/**
 * Get all labels for a specific type (useful for frontend filters/selects)
 */

export const getAllBillStatusLabels = (): StatusLabel[] => {
  return Object.values(BILL_STATUS_LABELS);
};

export const getAllFundStatusLabels = (): StatusLabel[] => {
  return Object.values(FUND_STATUS_LABELS);
};

export const getAllTransactionTypeLabels = () => {
  return Object.values(TRANSACTION_TYPE_LABELS);
};

export const getAllTransactionCategoryLabels = () => {
  return Object.values(TRANSACTION_CATEGORY_LABELS);
};

export const getAllPaymentMethodLabels = () => {
  return Object.values(PAYMENT_METHOD_LABELS);
};

export const getAllFundCategoryLabels = () => {
  return Object.values(FUND_CATEGORY_LABELS);
};

export const getAllAccountTypeLabels = () => {
  return Object.values(ACCOUNT_TYPE_LABELS);
};

export const getAllAccountStatusLabels = () => {
  return Object.values(ACCOUNT_STATUS_LABELS);
};
