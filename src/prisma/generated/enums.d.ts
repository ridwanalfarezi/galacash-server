export declare const UserRole: {
    readonly user: "user";
    readonly bendahara: "bendahara";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const TransactionType: {
    readonly income: "income";
    readonly expense: "expense";
};
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];
export declare const TransactionCategory: {
    readonly kas_kelas: "kas_kelas";
    readonly donation: "donation";
    readonly fundraising: "fundraising";
    readonly office_supplies: "office_supplies";
    readonly consumption: "consumption";
    readonly event: "event";
    readonly maintenance: "maintenance";
    readonly other: "other";
};
export type TransactionCategory = (typeof TransactionCategory)[keyof typeof TransactionCategory];
export declare const FundCategory: {
    readonly education: "education";
    readonly health: "health";
    readonly emergency: "emergency";
    readonly equipment: "equipment";
};
export type FundCategory = (typeof FundCategory)[keyof typeof FundCategory];
export declare const FundStatus: {
    readonly pending: "pending";
    readonly approved: "approved";
    readonly rejected: "rejected";
};
export type FundStatus = (typeof FundStatus)[keyof typeof FundStatus];
export declare const BillStatus: {
    readonly belum_dibayar: "belum_dibayar";
    readonly menunggu_konfirmasi: "menunggu_konfirmasi";
    readonly sudah_dibayar: "sudah_dibayar";
};
export type BillStatus = (typeof BillStatus)[keyof typeof BillStatus];
export declare const PaymentMethod: {
    readonly bank: "bank";
    readonly ewallet: "ewallet";
    readonly cash: "cash";
};
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export declare const AccountType: {
    readonly bank: "bank";
    readonly ewallet: "ewallet";
};
export type AccountType = (typeof AccountType)[keyof typeof AccountType];
export declare const AccountStatus: {
    readonly active: "active";
    readonly inactive: "inactive";
};
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];
//# sourceMappingURL=enums.d.ts.map