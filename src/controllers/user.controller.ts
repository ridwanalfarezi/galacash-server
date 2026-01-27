import { refreshTokenService, userService } from "@/services";
import { getCookieOptions } from "@/utils/cookie-options";
import { asyncHandler } from "@/utils/errors";
import { Request, Response } from "express";

/**
 * Get user profile
 * GET /api/users/profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;

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

  const user = await userService.getUserById(userId);

  res.status(200).json({
    success: true,
    data: user,
    message: "Profil berhasil diambil",
  });
});

/**
 * Update user profile
 * PUT /api/users/profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  const { name, email } = req.body;

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

  const updatedUser = await userService.updateProfile(userId, {
    name,
    email,
  });

  res.status(200).json({
    success: true,
    data: updatedUser,
    message: "Profil berhasil diperbarui",
  });
});

/**
 * Change password
 * PUT /api/users/password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  const { oldPassword, newPassword } = req.body;

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

  await userService.changePassword(userId, oldPassword, newPassword);

  // Remove all refresh tokens and clear auth cookies to force re-authentication
  await refreshTokenService.deleteAllByUserId(userId);

  const cookieOptions = getCookieOptions();
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  res.status(200).json({
    success: true,
    message: "Password berhasil diubah. Silakan login kembali.",
  });
});

/**
 * Upload user avatar
 * POST /api/users/avatar
 */
export const uploadAvatar = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  const fileUrl = req.fileUrl;

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

  if (!fileUrl) {
    res.status(400).json({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "File belum diupload",
      },
    });
    return;
  }

  const updatedUser = await userService.uploadAvatar(userId, fileUrl);

  res.status(200).json({
    success: true,
    data: updatedUser,
    message: "Avatar berhasil diupload",
  });
});

/**
 * Get classmates (students in same class)
 * GET /api/users/classmates
 */
export const getClassmates = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const classId = req.user?.classId;

  if (!classId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User belum terautentikasi",
      },
    });
    return;
  }

  const classmates = await userService.getClassmates(classId);

  res.status(200).json({
    success: true,
    data: classmates,
    message: "Data teman sekelas berhasil diambil",
  });
});
