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

  // Set httpOnly cookies for tokens
  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none", // Required for cross-domain cookies
    maxAge: 60 * 60 * 1000, // 1 hour
    path: "/",
  });

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none", // Required for cross-domain cookies
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });

  // Return only user data (not tokens)
  res.status(200).json({
    success: true,
    data: {
      user: result.user,
    },
    message: "Login successful",
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Read refresh token from cookie instead of body
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "No refresh token provided",
      },
    });
    return;
  }

  const result = await authService.refresh(refreshToken);

  // Set new access token cookie
  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: 60 * 60 * 1000, // 1 hour
    path: "/",
  });

  res.status(200).json({
    success: true,
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

  // Clear cookies
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    path: "/",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    path: "/",
  });

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
