import { userService } from "@/services";
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
        message: "User not authenticated",
      },
    });
    return;
  }

  const user = await userService.getUserById(userId);

  res.status(200).json({
    success: true,
    data: user,
    message: "Profile fetched",
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
        message: "User not authenticated",
      },
    });
    return;
  }

  const updatedUser = await userService.updateProfile(
    userId,
    {
      name,
      email,
    },
    req.user?.role ?? "user"
  );

  res.status(200).json({
    success: true,
    data: updatedUser,
    message: "Profile updated",
  });
});

/**
 * Change password
 * PUT /api/users/change-password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  const { currentPassword, newPassword } = req.body;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      },
    });
    return;
  }

  await userService.changePassword(userId, currentPassword, newPassword);

  res.status(200).json({
    success: true,
    message: "Password changed",
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
        message: "User not authenticated",
      },
    });
    return;
  }

  if (!fileUrl) {
    res.status(400).json({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "File not uploaded",
      },
    });
    return;
  }

  const updatedUser = await userService.uploadAvatar(userId, fileUrl);

  res.status(200).json({
    success: true,
    data: updatedUser,
    message: "Avatar uploaded",
  });
});
