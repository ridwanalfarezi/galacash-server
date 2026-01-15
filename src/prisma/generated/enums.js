"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountStatus = exports.AccountType = exports.PaymentMethod = exports.BillStatus = exports.FundStatus = exports.FundCategory = exports.TransactionCategory = exports.TransactionType = exports.UserRole = void 0;
exports.UserRole = {
    user: 'user',
    bendahara: 'bendahara'
};
exports.TransactionType = {
    income: 'income',
    expense: 'expense'
};
exports.TransactionCategory = {
    kas_kelas: 'kas_kelas',
    donation: 'donation',
    fundraising: 'fundraising',
    office_supplies: 'office_supplies',
    consumption: 'consumption',
    event: 'event',
    maintenance: 'maintenance',
    other: 'other'
};
exports.FundCategory = {
    education: 'education',
    health: 'health',
    emergency: 'emergency',
    equipment: 'equipment'
};
exports.FundStatus = {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected'
};
exports.BillStatus = {
    belum_dibayar: 'belum_dibayar',
    menunggu_konfirmasi: 'menunggu_konfirmasi',
    sudah_dibayar: 'sudah_dibayar'
};
exports.PaymentMethod = {
    bank: 'bank',
    ewallet: 'ewallet',
    cash: 'cash'
};
exports.AccountType = {
    bank: 'bank',
    ewallet: 'ewallet'
};
exports.AccountStatus = {
    active: 'active',
    inactive: 'inactive'
};
//# sourceMappingURL=enums.js.map