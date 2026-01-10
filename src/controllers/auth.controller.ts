import { authService, refreshTokenService, userService } from "@/services";
import { asyncHandler } from "@/utils/errors";
import { Request, Response } from "express";

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Login is based on NIM (student ID) and password
  const { nim, password } = req.body;

  const result = await authService.login(nim, password);

  res.status(200).json({
    success: true,
    data: result,
    message: "Login successful",
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  const result = await authService.refresh(refreshToken);

  res.status(200).json({
    success: true,
    data: result,
    message: "Token refreshed",
  });
});

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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

  await refreshTokenService.deleteAllByUserId(userId);

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

/**
 * Get current user info
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    message: "User fetched",
  });
});
