import { User } from '@/prisma/generated/client';
import { RefreshTokenRepository } from '@/repositories/refresh-token.repository';
import { userRepository } from '@/repositories/user.repository';
import { AuthenticationError, NotFoundError } from '@/utils/errors';
import {
  deleteRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
} from '@/utils/generate-tokens';
import { prisma } from '@/utils/prisma-client';
import { CacheService } from './cache.service';

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication service for handling login, logout, and token management
 */
export class AuthService {
  private refreshTokenRepository: RefreshTokenRepository;
  private cacheService: CacheService;

  constructor() {
    this.refreshTokenRepository = new RefreshTokenRepository();
    this.cacheService = new CacheService();
  }

  /**
   * Login with NIM and password
   * Validates credentials and returns user + tokens
   */
  async login(nim: string, password: string): Promise<LoginResponse> {
    // Find user by NIM
    const user = await userRepository.findByNim(nim);
    if (!user) {
      throw new AuthenticationError('Invalid NIM or password');
    }

    // Verify password
    const isPasswordValid = await Bun.password.verify(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid NIM or password');
    }

    const tokenVersion = (user as unknown as { tokenVersion?: number }).tokenVersion ?? 1;

    // Cache current tokenVersion in Redis for fast-path auth middleware check
    await this.cacheService.setCached(
      this.cacheService.userVersionKey(user.id),
      tokenVersion.toString(),
      86400
    );

    // Generate tokens with version
    const accessToken = generateAccessToken({
      id: user.id,
      nim: user.nim,
      name: user.name,
      role: user.role as 'user' | 'bendahara',
      classId: user.classId,
      tokenVersion,
    });

    const refreshToken = generateRefreshToken();

    // Store refresh token in database
    await storeRefreshToken(user.id, refreshToken);

    // Cache user
    await this.cacheService.setCached(this.cacheService.userKey(user.id), user);

    // Remove password from response
    const { password: _password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as User,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   * Implements refresh token rotation for enhanced security
   */
  async refresh(refreshToken: string): Promise<RefreshTokenResponse> {
    // Verify refresh token signature
    try {
      verifyRefreshToken(refreshToken);
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    // Find refresh token in database
    const storedToken = await this.refreshTokenRepository.findByToken(refreshToken);
    if (!storedToken) {
      throw new AuthenticationError('Refresh token not found or expired');
    }

    const user = storedToken.user;
    const tokenVersion = (user as unknown as { tokenVersion?: number }).tokenVersion ?? 1;

    // Delete the old refresh token (rotation)
    await deleteRefreshToken(refreshToken);

    // Generate new tokens
    const accessToken = generateAccessToken({
      id: user.id,
      nim: user.nim,
      name: user.name,
      role: user.role as 'user' | 'bendahara',
      classId: user.classId,
      tokenVersion,
    });

    const newRefreshToken = generateRefreshToken();

    // Store new refresh token in database
    await storeRefreshToken(user.id, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout by deleting refresh token
   * Invalidates the refresh token from the database
   */
  async logout(refreshToken: string): Promise<void> {
    await deleteRefreshToken(refreshToken);
  }

  /**
   * Revoke all sessions for a user instantly across all devices
   * Increments DB tokenVersion and updates Redis version cache
   */
  async revokeAllSessions(userId: string): Promise<void> {
    // 1. Delete all refresh tokens for the user
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // 2. Increment tokenVersion in DB
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
      },
    });

    // 3. Update version in Redis for fast-path middleware rejection
    await this.cacheService.setCached(
      this.cacheService.userVersionKey(userId),
      updatedUser.tokenVersion.toString(),
      86400
    );

    // 4. Invalidate user profile cache
    await this.cacheService.invalidateUser(userId);
  }

  /**
   * Get current user by ID with cache
   * Returns user from cache if available, otherwise from database
   */
  async getCurrentUser(userId: string): Promise<User> {
    // Try to get from cache
    const cachedUser = await this.cacheService.getCached<User>(this.cacheService.userKey(userId));
    if (cachedUser) {
      return cachedUser;
    }

    // Get from database
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'User');
    }

    // Cache for future requests
    await this.cacheService.setCached(this.cacheService.userKey(userId), user);

    return user;
  }
}

export const authService = new AuthService();
