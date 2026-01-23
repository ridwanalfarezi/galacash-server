import { User } from "@/prisma/generated/client";
import { userRepository } from "@/repositories/user.repository";
import { AuthenticationError, AuthorizationError, NotFoundError } from "@/utils/errors";
import bcrypt from "bcrypt";
import { CacheService } from "./cache.service";

export interface UpdateProfileData {
  name?: string;
  email?: string;
}

export interface GetStudentsFilters {
  classId?: string;
  page?: number;
  limit?: number;
  search?: string;
}

// Type for sanitized user response (without password)
export type SafeUser = Omit<User, "password">;

/**
 * User service for handling user profile operations
 */
export class UserService {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "User");
    }

    // Map class name to className field
    const userWithClass = user as User & { class?: { name: string } };
    const userWithClassName = {
      ...user,
      className: userWithClass.class?.name,
    };

    return this.sanitizeUser(userWithClassName);
  }

  /**
   * Get user by ID (alias for getProfile)
   */
  async getUserById(userId: string): Promise<SafeUser> {
    return this.getProfile(userId);
  }

  /**
   * Update user profile
   * Email field can only be updated by bendahara role
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileData,
    userRole: "user" | "bendahara" = "user"
  ): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "User");
    }

    // Only bendahara can update email
    if (data.email && userRole !== "bendahara") {
      throw new AuthorizationError("Only bendahara can update email");
    }

    // Update user profile
    const updateData: { name?: string; email?: string } = {};
    if (data.name) {
      updateData.name = data.name;
    }
    if (data.email) {
      updateData.email = data.email;
    }

    const updatedUser = await userRepository.update(userId, updateData);

    // Invalidate cache
    await this.cacheService.invalidateUser(userId);

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Change user password
   * Validates old password and hashes new one
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "User");
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new AuthenticationError("Old password is incorrect");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await userRepository.update(userId, {
      password: hashedPassword,
    });

    // Invalidate cache
    await this.cacheService.invalidateUser(userId);
  }

  /**
   * Upload/update user avatar
   * Updates the avatarUrl field for the user
   */
  async uploadAvatar(userId: string, fileUrl: string): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "User");
    }

    const updatedUser = await userRepository.update(userId, {
      avatarUrl: fileUrl,
    });

    // Invalidate cache
    await this.cacheService.invalidateUser(userId);

    return this.sanitizeUser(updatedUser);
  }

  async getStudents(filters: GetStudentsFilters) {
    const studentsResponse = await userRepository.findAll({
      role: "user",
      classId: filters.classId,
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
    });

    return {
      ...studentsResponse,
      data: studentsResponse.data.map((user) => this.sanitizeUser(user)),
    };
  }

  /**
   * Get classmates (students in same class) for filter options
   * Returns basic user info (id, name, nim)
   */
  async getClassmates(classId: string): Promise<Array<{ id: string; name: string; nim: string }>> {
    const students = await userRepository.findAll({
      role: "user",
      classId,
      page: 1,
      limit: 1000, // Get all students
    });

    // Return simplified data for filters
    return students.data.map((user) => ({
      id: user.id,
      name: user.name,
      nim: user.nim,
    }));
  }
}

export const userService = new UserService();
