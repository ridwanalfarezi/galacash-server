import { Prisma, User, UserRole } from "@/prisma/generated/client";
import { AppError, ConflictError, DatabaseError, NotFoundError } from "@/utils/errors";
import { prisma } from "@/utils/prisma-client";

export interface UserFilters {
  role?: string;
  classId?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class UserRepository {
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: { class: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch user");
      }
      throw error;
    }
  }

  /**
   * Find user by NIM (Student ID)
   */
  async findByNim(nim: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { nim },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch user by NIM");
      }
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findFirst({
        where: { email },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch user by email");
      }
      throw error;
    }
  }

  /**
   * Create new user
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await prisma.user.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          const target = (error.meta?.target as string[])?.[0];
          if (target === "nim") {
            throw new ConflictError("NIM already exists", "nim");
          }
          if (target === "email") {
            throw new ConflictError("Email already exists", "email");
          }
        }
        throw new DatabaseError("Failed to create user");
      }
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new NotFoundError("User not found", "User");
      }

      return await prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          const target = (error.meta?.target as string[])?.[0];
          if (target === "nim") {
            throw new ConflictError("NIM already exists", "nim");
          }
          if (target === "email") {
            throw new ConflictError("Email already exists", "email");
          }
        }
        throw new DatabaseError("Failed to update user");
      }
      throw error;
    }
  }

  /**
   * Find all users in a class
   */
  async findAllByClassId(classId: string): Promise<User[]> {
    try {
      return await prisma.user.findMany({
        where: { classId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch users");
      }
      throw error;
    }
  }

  /**
   * Find all users with pagination and filters
   */
  async findAll(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    const { role, classId, search, page = 1, limit = 20 } = filters;

    try {
      const where: Prisma.UserWhereInput = {};

      if (role) {
        where.role = role as UserRole;
      }

      if (classId) {
        where.classId = classId;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { nim: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError("Failed to fetch users");
      }
      throw error;
    }
  }
}

export const userRepository = new UserRepository();
