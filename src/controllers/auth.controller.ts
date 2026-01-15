import { authService, refreshTokenService, userService } from "@/services";
import { asyncHandler } from "@/utils/errors";
import { Request, Response } from "express";

/**
 * Get secure cookie options based on environment
 */
function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const isSecureContext = process.env.FRONTEND_URL?.startsWith("https") ?? isProduction;

  return {
    httpOnly: true,
    secure: isSecureContext, // Only set secure if frontend uses HTTPS
    sameSite: isSecureContext ? ("none" as const) : ("lax" as const), // Use 'lax' for development, 'none' for production
    path: "/",
  };
}

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Login is based on NIM (student ID) and password
  const { nim, password } = req.body;

  const result = await authService.login(nim, password);

  // Set httpOnly cookies for tokens with environment-aware options
  const cookieOptions = getCookieOptions();

  res.cookie("accessToken", result.accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

  // Set new access token cookie with environment-aware options
  const cookieOptions = getCookieOptions();

  res.cookie("accessToken", result.accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000, // 1 hour
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

  // Clear cookies with environment-aware options
  const cookieOptions = getCookieOptions();

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

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
