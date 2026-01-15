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
  classId: string;
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * User service for handling user profile operations
 */
export class UserService {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "User");
    }

    // Map class name to className field
    return {
      ...user,
      className: (user as any).class?.name,
    } as User;
  }

  /**
   * Get user by ID (alias for getProfile)
   */
  async getUserById(userId: string): Promise<User> {
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
  ): Promise<User> {
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

    return updatedUser;
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
  async uploadAvatar(userId: string, fileUrl: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "User");
    }

    const updatedUser = await userRepository.update(userId, {
      avatarUrl: fileUrl,
    });

    // Invalidate cache
    await this.cacheService.invalidateUser(userId);

    return updatedUser;
  }

  async getStudents(filters: GetStudentsFilters) {
    return userRepository.findAll({
      role: "user",
      classId: filters.classId,
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
    });
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
