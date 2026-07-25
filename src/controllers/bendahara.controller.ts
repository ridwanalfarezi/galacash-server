import { bendaharaService, userService } from '../services/index.js';
import { asyncHandler } from '../utils/errors/index.js';
import { Request, Response } from 'express';

export const getDashboard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { startDate, endDate, classId } = req.query;
  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;

  const targetClassId = typeof classId === 'string' ? classId : undefined;

  const dashboard = await bendaharaService.getDashboard(targetClassId, start, end);

  res.status(200).json({
    success: true,
    data: dashboard,
    message: 'Dashboard berhasil diambil',
  });
});

export const approveFundApplication = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const bendaharaId = req.user!.sub;
    const { id } = req.params;
    const applicationId = Array.isArray(id) ? id[0] : id;

    const application = await bendaharaService.approveFundApplication(applicationId, bendaharaId);

    res.status(200).json({
      success: true,
      data: application,
      message: 'Pengajuan dana disetujui',
    });
  }
);

export const rejectFundApplication = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const bendaharaId = req.user!.sub;
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const applicationId = Array.isArray(id) ? id[0] : id;

    const application = await bendaharaService.rejectFundApplication(
      applicationId,
      bendaharaId,
      rejectionReason
    );

    res.status(200).json({
      success: true,
      data: application,
      message: 'Pengajuan dana ditolak',
    });
  }
);

export const getAllCashBills = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 10, status, classId, userId, search } = req.query;

  const statusFilter =
    typeof status === 'string' ? status : Array.isArray(status) ? String(status[0]) : undefined;
  const targetClassId = typeof classId === 'string' ? classId : undefined;
  const targetUserId = typeof userId === 'string' ? userId : undefined;
  const searchQuery = typeof search === 'string' ? search : undefined;

  const bills = await bendaharaService.getAllCashBills({
    page: Number(page),
    limit: Number(limit),
    status: statusFilter,
    classId: targetClassId,
    userId: targetUserId,
    search: searchQuery,
  });

  res.status(200).json({
    success: true,
    data: bills,
    message: 'Semua tagihan kas berhasil diambil',
  });
});

export const confirmPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const bendaharaId = req.user!.sub;
  const { id } = req.params;
  const billId = Array.isArray(id) ? id[0] : id;

  const bill = await bendaharaService.confirmPayment(billId, bendaharaId);

  res.status(200).json({
    success: true,
    data: bill,
    message: 'Pembayaran dikonfirmasi',
  });
});

export const rejectPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body;
  const billId = Array.isArray(id) ? id[0] : id;

  const bill = await bendaharaService.rejectPayment(billId, reason);

  res.status(200).json({
    success: true,
    data: bill,
    message: 'Pembayaran ditolak',
  });
});

export const getRekapKas = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { startDate, endDate, search, page = 1, limit = 10, paymentStatus, classId } = req.query;

  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;
  const targetClassId = typeof classId === 'string' ? classId : undefined;

  const rekapKas = await bendaharaService.getRekapKas(targetClassId, {
    startDate: start,
    endDate: end,
    search: search as string | undefined,
    page: Number(page),
    limit: Number(limit),
    paymentStatus: paymentStatus as 'up-to-date' | 'has-arrears' | undefined,
  });

  res.status(200).json({
    success: true,
    data: rekapKas,
    message: 'Rekap kas berhasil diambil',
  });
});

export const exportRekapKas = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { startDate, endDate, search, paymentStatus, classId } = req.query;

  const { exportService } = await import('../services/export.service.js');

  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;
  const targetClassId = typeof classId === 'string' ? classId : undefined;

  const rekapKas = await bendaharaService.getRekapKas(targetClassId, {
    startDate: start,
    endDate: end,
    search: search as string | undefined,
    page: 1,
    limit: 10000,
    paymentStatus: paymentStatus as 'up-to-date' | 'has-arrears' | undefined,
  });

  const buffer = await exportService.exportRekapKasToExcel(rekapKas);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="rekap-kas-${new Date().toISOString().split('T')[0]}.xlsx"`
  );
  res.send(buffer);
});

export const getStudents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 10, search, classId } = req.query;

  const targetClassId = typeof classId === 'string' ? classId : undefined;

  const students = await userService.getStudents({
    page: Number(page),
    limit: Number(limit),
    search: search as string | undefined,
    classId: targetClassId,
  });

  res.status(200).json({
    success: true,
    data: students,
    message: 'Data siswa berhasil diambil',
  });
});

export const getStudentDetail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const studentId = Array.isArray(id) ? id[0] : id;

  const student = await bendaharaService.getStudentDetail(studentId);

  if (!student) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Siswa tidak ditemukan' },
    });
    return;
  }

  const { password: _password, ...safeStudent } = student;

  res.status(200).json({
    success: true,
    data: safeStudent,
    message: 'Detail siswa berhasil diambil',
  });
});

export const createTransaction = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { date, description, type, amount, category } = req.body;
    const attachment = req.fileUrl;

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
      message: 'Transaksi berhasil dibuat',
    });
  }
);
