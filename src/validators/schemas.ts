import Joi from "joi";

// ============ AUTHENTICATION SCHEMAS ============

export const loginSchema = Joi.object({
  nim: Joi.string()
    .pattern(/^13136[0-9]{5}$/)
    .required()
    .messages({
      "string.pattern.base": "NIM harus 10 digit dan dimulai dengan 13136",
      "any.required": "NIM wajib diisi",
    }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password minimal 8 karakter",
    "any.required": "Password wajib diisi",
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token wajib diisi",
  }),
});

// ============ USER SCHEMAS ============

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(3).max(100).messages({
    "string.min": "Nama minimal 3 karakter",
    "string.max": "Nama maksimal 100 karakter",
  }),
  email: Joi.string().email().messages({
    "string.email": "Format email tidak valid",
  }),
}).min(1);

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    "any.required": "Password lama wajib diisi",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "Password baru minimal 8 karakter",
    "any.required": "Password baru wajib diisi",
  }),
});

// ============ FUND APPLICATION SCHEMAS ============

export const createFundApplicationSchema = Joi.object({
  purpose: Joi.string().max(255).required().messages({
    "string.max": "Tujuan maksimal 255 karakter",
    "any.required": "Tujuan wajib diisi",
  }),
  description: Joi.string().allow("").optional(),
  category: Joi.string()
    .valid("subscription", "consumption", "competition", "printing", "donation", "other")
    .required()
    .messages({
      "any.only": "Kategori tidak valid",
      "any.required": "Kategori wajib diisi",
    }),
  amount: Joi.number().positive().required().messages({
    "number.positive": "Jumlah harus lebih dari 0",
    "any.required": "Jumlah wajib diisi",
  }),
});

export const rejectFundApplicationSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(1).required().messages({
    "string.min": "Alasan penolakan tidak boleh kosong",
    "any.required": "Alasan penolakan wajib diisi",
  }),
});

// ============ CASH BILL SCHEMAS ============

export const payBillSchema = Joi.object({
  paymentMethod: Joi.string().valid("bank", "cash").required().messages({
    "any.only": "Metode pembayaran tidak valid",
    "any.required": "Metode pembayaran wajib diisi",
  }),
});

// ============ TRANSACTION SCHEMAS ============

export const exportTransactionSchema = Joi.object({
  format: Joi.string().valid("xlsx", "pdf").required().messages({
    "any.only": "Format harus xlsx atau pdf",
    "any.required": "Format wajib diisi",
  }),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref("startDate")).optional().messages({
    "date.min": "Tanggal akhir harus setelah tanggal awal",
  }),
  type: Joi.string().valid("all", "income", "expense").optional(),
});

// ============ QUERY PARAMETER SCHEMAS ============

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref("startDate")).optional().messages({
    "date.min": "Tanggal akhir harus setelah tanggal awal",
  }),
});

export const transactionFilterSchema = paginationSchema.keys({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional().messages({
    "date.min": "Tanggal akhir harus setelah tanggal awal",
  }),
  type: Joi.string().valid("income", "expense").optional(),
  sortBy: Joi.string().valid("date", "amount", "type").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

export const fundApplicationFilterSchema = paginationSchema.keys({
  status: Joi.string().valid("pending", "approved", "rejected").optional(),
  category: Joi.string()
    .valid("subscription", "consumption", "competition", "printing", "donation", "other")
    .optional(),
  applicantId: Joi.string().uuid().optional(),
  minAmount: Joi.number().positive().optional(),
  maxAmount: Joi.number().positive().min(Joi.ref("minAmount")).optional(),
  sortBy: Joi.string().valid("date", "amount", "status").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

export const cashBillFilterSchema = paginationSchema.keys({
  status: Joi.string().valid("belum_dibayar", "menunggu_konfirmasi", "sudah_dibayar").optional(),
  month: Joi.string().optional(),
  year: Joi.number().integer().min(2020).max(2100).optional(),
  userId: Joi.string().uuid().optional(),
  sortBy: Joi.string().valid("dueDate", "month", "status").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

// ============ BENDAHARA SCHEMAS ============

export const createTransactionSchema = Joi.object({
  date: Joi.date().iso().required().messages({
    "any.required": "Tanggal wajib diisi",
    "date.format": "Format tanggal tidak valid",
  }),
  description: Joi.string().min(3).max(255).required().messages({
    "string.min": "Deskripsi minimal 3 karakter",
    "string.max": "Deskripsi maksimal 255 karakter",
    "any.required": "Deskripsi wajib diisi",
  }),
  type: Joi.string().valid("income", "expense").required().messages({
    "any.only": "Tipe harus income atau expense",
    "any.required": "Tipe transaksi wajib diisi",
  }),
  amount: Joi.number().positive().required().messages({
    "number.positive": "Jumlah harus lebih dari 0",
    "any.required": "Jumlah wajib diisi",
  }),
  category: Joi.string()
    .valid(
      "kas_kelas",
      "donation",
      "fundraising",
      "office_supplies",
      "consumption",
      "event",
      "maintenance",
      "other"
    )
    .optional()
    .messages({
      "any.only": "Kategori tidak valid",
    }),
});

export const rekapKasFilterSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
  groupBy: Joi.string().valid("day", "week", "month", "year").optional(),
});
