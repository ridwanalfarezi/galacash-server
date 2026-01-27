import { fundApplicationService } from "@/services";
import { asyncHandler } from "@/utils/errors";
import { Request, Response } from "express";

/**
 * Get all fund applications
 * GET /api/fund-applications
 */
export const getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 10, status, classId, search } = req.query;

  const statusFilter =
    typeof status === "string" ? status : Array.isArray(status) ? String(status[0]) : undefined;
  const targetClassId = typeof classId === "string" ? classId : undefined;
  const searchQuery = typeof search === "string" ? search : undefined;

  const applications = await fundApplicationService.getAll({
    page: Number(page),
    limit: Number(limit),
    status: statusFilter,
    classId: targetClassId,
    search: searchQuery,
  });

  res.status(200).json({
    success: true,
    data: applications,
    message: "Data pengajuan dana berhasil diambil",
  });
});

/**
 * Get user's fund applications
 * GET /api/fund-applications/my
 */
export const getMy = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  const { page = 1, limit = 10, status, search } = req.query;

  const statusFilter =
    typeof status === "string" ? status : Array.isArray(status) ? String(status[0]) : undefined;
  const searchQuery = typeof search === "string" ? search : undefined;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User belum terautentikasi",
      },
    });
    return;
  }

  const applications = await fundApplicationService.getMyApplications(userId, {
    page: Number(page),
    limit: Number(limit),
    status: statusFilter,
    search: searchQuery,
  });

  res.status(200).json({
    success: true,
    data: applications,
    message: "Pengajuan dana Anda berhasil diambil",
  });
});

/**
 * Get fund application by ID
 * GET /api/fund-applications/:id
 */
export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const applicationId = Array.isArray(id) ? id[0] : id;

  const application = await fundApplicationService.getById(applicationId);

  res.status(200).json({
    success: true,
    data: application,
    message: "Detail pengajuan dana berhasil diambil",
  });
});

/**
 * Create fund application
 * POST /api/fund-applications
 */
export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  const classId = req.user?.classId;
  const { purpose, description, category, amount, attachmentUrl } = req.body;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User belum terautentikasi",
      },
    });
    return;
  }

  const application = await fundApplicationService.create(userId, classId ?? "", {
    purpose,
    description,
    category,
    amount,
    attachmentUrl: attachmentUrl ?? req.fileUrl,
  });

  res.status(201).json({
    success: true,
    data: application,
    message: "Pengajuan dana berhasil dibuat",
  });
});
