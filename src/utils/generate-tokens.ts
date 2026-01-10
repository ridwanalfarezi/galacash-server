import jwt from "jsonwebtoken";
import { prisma } from "./prisma-client";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";

export interface AccessTokenPayload {
  sub: string; // User ID
  nim: string;
  name: string;
  role: "user" | "bendahara";
  classId: string;
  iat: number;
  exp: number;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(user: {
  id: string;
  nim: string;
  name: string;
  role: "user" | "bendahara";
  classId: string;
}): string {
  const payload: Omit<AccessTokenPayload, "iat" | "exp"> = {
    sub: user.id,
    nim: user.nim,
    name: user.name,
    role: user.role,
    classId: user.classId,
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(): string {
  return jwt.sign({}, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Store refresh token in database
 */
export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const decoded = jwt.decode(token) as jwt.JwtPayload;

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt: new Date((decoded.exp as number) * 1000),
    },
  });
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as jwt.JwtPayload;
}

/**
 * Delete refresh token from database
 */
export async function deleteRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { token },
  });
}

/**
 * Clean up expired refresh tokens
 */
export async function cleanupExpiredTokens(): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
