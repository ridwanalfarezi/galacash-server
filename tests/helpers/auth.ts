import app from "@/app";
import { prisma } from "@/utils/prisma-client";
import request from "supertest";

export const createTestUser = async (nim = "1313624000", role = "user") => {
  // Check if class exists
  let cls = await prisma.class.findUnique({ where: { name: "Test Class Auth" } });
  if (!cls) {
    cls = await prisma.class.create({
      data: {
        name: "Test Class Auth",
      },
    });
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { nim } });
  if (existingUser) {
    return { user: existingUser, cls, password: "password123" };
  }

  const hashedPassword = await Bun.password.hash("password123", {
    algorithm: "bcrypt",
    cost: 10,
  });

  // Enum role casting if needed, but string works with Prisma types usually if matches enum
  const user = await prisma.user.create({
    data: {
      nim,
      name: `Test Student ${nim}`,
      password: hashedPassword,
      classId: cls.id,
      role: role as any,
    },
  });

  return { user, cls, password: "password123" };
};

export const loginUser = async (nim = "1313624000", role = "user") => {
  const { password } = await createTestUser(nim, role);

  const response = await request(app)
    .post("/api/auth/login")
    .send({
      nim,
      password,
    });

  const cookies = response.headers["set-cookie"];
  const accessTokenCookie = cookies.find((c: string) => c.startsWith("accessToken="));

  return accessTokenCookie; // Full cookie string "accessToken=...; Path=/; ..."
};
