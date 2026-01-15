import { CashBill, FundApplication, Transaction } from "@/prisma/generated/client";
import {
  getBillStatusLabel,
  getFundCategoryLabel,
  getFundStatusLabel,
  getPaymentMethodLabel,
  getTransactionCategoryLabel,
  getTransactionTypeLabel,
  StatusLabel,
} from "./status-labels";

/**
 * Add status label to cash bill object
 */
export const addBillStatusLabel = <T extends Pick<CashBill, "status" | "paymentMethod">>(
  bill: T
): T & { statusLabel: StatusLabel; paymentMethodLabel?: StatusLabel } => {
  return {
    ...bill,
    statusLabel: getBillStatusLabel(bill.status),
    paymentMethodLabel: bill.paymentMethod ? getPaymentMethodLabel(bill.paymentMethod) : undefined,
  };
};

/**
 * Add status label to fund application object
 */
export const addFundStatusLabel = <T extends Pick<FundApplication, "status" | "category">>(
  fund: T
): T & { statusLabel: StatusLabel; categoryLabel: StatusLabel } => {
  return {
    ...fund,
    statusLabel: getFundStatusLabel(fund.status),
    categoryLabel: getFundCategoryLabel(fund.category),
  };
};

/**
 * Add labels to transaction object
 */
export const addTransactionLabels = <
  T extends Pick<Transaction, "type"> & { category?: string | null },
>(
  transaction: T
): T & { typeLabel: StatusLabel; categoryLabel?: StatusLabel } => {
  return {
    ...transaction,
    typeLabel: getTransactionTypeLabel(transaction.type),
    categoryLabel: transaction.category
      ? getTransactionCategoryLabel(transaction.category)
      : undefined,
  };
};

/**
 * Add status labels to array of cash bills
 */
export const addBillStatusLabels = <T extends Pick<CashBill, "status" | "paymentMethod">>(
  bills: T[]
): (T & { statusLabel: StatusLabel; paymentMethodLabel?: StatusLabel })[] => {
  return bills.map(addBillStatusLabel);
};

/**
 * Add status labels to array of fund applications
 */
export const addFundStatusLabels = <T extends Pick<FundApplication, "status" | "category">>(
  funds: T[]
): (T & { statusLabel: StatusLabel; categoryLabel: StatusLabel })[] => {
  return funds.map(addFundStatusLabel);
};

/**
 * Add labels to array of transactions
 */
export const addTransactionLabelsToArray = <
  T extends Pick<Transaction, "type"> & { category?: string | null },
>(
  transactions: T[]
): (T & { typeLabel: StatusLabel; categoryLabel?: StatusLabel })[] => {
  return transactions.map(addTransactionLabels);
};
