import { User } from "@/prisma/generated/client";
import { RefreshTokenRepository } from "@/repositories/refresh-token.repository";
import { userRepository } from "@/repositories/user.repository";
import { AuthenticationError, NotFoundError } from "@/utils/errors";
import {
  deleteRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
} from "@/utils/generate-tokens";
import bcrypt from "bcrypt";
import { CacheService } from "./cache.service";

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
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
      throw new AuthenticationError("Invalid NIM or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid NIM or password");
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      nim: user.nim,
      name: user.name,
      role: user.role as "user" | "bendahara",
      classId: user.classId,
    });

    const refreshToken = generateRefreshToken();

    // Store refresh token in database
    await storeRefreshToken(user.id, refreshToken);

    // Cache user
    await this.cacheService.setCached(this.cacheService.userKey(user.id), user);

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as User,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   * Verifies refresh token and generates new access token
   */
  async refresh(refreshToken: string): Promise<RefreshTokenResponse> {
    // Verify refresh token signature
    try {
      verifyRefreshToken(refreshToken);
    } catch {
      throw new AuthenticationError("Invalid or expired refresh token");
    }

    // Find refresh token in database
    const storedToken = await this.refreshTokenRepository.findByToken(refreshToken);
    if (!storedToken) {
      throw new AuthenticationError("Refresh token not found or expired");
    }

    const user = storedToken.user;

    // Generate new access token
    const accessToken = generateAccessToken({
      id: user.id,
      nim: user.nim,
      name: user.name,
      role: user.role as "user" | "bendahara",
      classId: user.classId,
    });

    return { accessToken };
  }

  /**
   * Logout by deleting refresh token
   * Invalidates the refresh token from the database
   */
  async logout(refreshToken: string): Promise<void> {
    await deleteRefreshToken(refreshToken);
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
      throw new NotFoundError("User not found", "User");
    }

    // Cache for future requests
    await this.cacheService.setCached(this.cacheService.userKey(userId), user);

    return user;
  }
}

export const authService = new AuthService();
