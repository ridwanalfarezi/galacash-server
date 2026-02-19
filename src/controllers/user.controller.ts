import { refreshTokenService, userService } from '@/services';
import { getCookieOptions } from '@/utils/cookie-options';
import { asyncHandler } from '@/utils/errors';
import { Request, Response } from 'express';

export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  const user = await userService.getUserById(userId);

  res.status(200).json({
    success: true,
    data: user,
    message: 'Profil berhasil diambil',
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { name, email } = req.body;

  const updatedUser = await userService.updateProfile(userId, {
    name,
    email,
  });

  res.status(200).json({
    success: true,
    data: updatedUser,
    message: 'Profil berhasil diperbarui',
  });
});

export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { oldPassword, newPassword } = req.body;

  await userService.changePassword(userId, oldPassword, newPassword);

  await refreshTokenService.deleteAllByUserId(userId);

  const cookieOptions = getCookieOptions();
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  res.status(200).json({
    success: true,
    message: 'Password berhasil diubah. Silakan login kembali.',
  });
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const fileUrl = req.fileUrl;

  if (!fileUrl) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'File belum diupload',
      },
    });
    return;
  }

  const updatedUser = await userService.uploadAvatar(userId, fileUrl);

  res.status(200).json({
    success: true,
    data: updatedUser,
    message: 'Avatar berhasil diupload',
  });
});

export const getClassmates = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const classId = req.user!.classId;

  const classmates = await userService.getClassmates(classId);

  res.status(200).json({
    success: true,
    data: classmates,
    message: 'Data teman sekelas berhasil diambil',
  });
});
