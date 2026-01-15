import { Prisma, RefreshToken, User } from "@/prisma/generated/client";
import { DatabaseError, NotFoundError } from "@/utils/errors";
import { prisma } from "@/utils/prisma-client";

export class RefreshTokenRepository {
  /**
   * Create new refresh token
   */
  async create(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    try {
      return await prisma.refreshToken.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to create refresh token");
      }
      throw error;
    }
  }

  /**
   * Find refresh token by token string
   */
  async findByToken(token: string): Promise<(RefreshToken & { user: User }) | null> {
    try {
      return await prisma.refreshToken.findUnique({
        where: { token },
        include: {
          user: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch refresh token");
      }
      throw error;
    }
  }

  /**
   * Delete refresh token
   */
  async delete(token: string): Promise<RefreshToken> {
    try {
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token },
      });

      if (!refreshToken) {
        throw new NotFoundError("Refresh token not found", "RefreshToken");
      }

      return await prisma.refreshToken.delete({
        where: { token },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Refresh token not found", "RefreshToken");
        }
        throw new DatabaseError("Failed to delete refresh token");
      }
      throw error;
    }
  }

  /**
   * Delete all refresh tokens for a user
   */
  async deleteByUserId(userId: string): Promise<{ count: number }> {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: { userId },
      });

      return { count: result.count };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to delete user refresh tokens");
      }
      throw error;
    }
  }

  /**
   * Delete expired refresh tokens
   */
  async cleanupExpired(): Promise<{ count: number }> {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      return { count: result.count };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to cleanup expired tokens");
      }
      throw error;
    }
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
