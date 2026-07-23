import app from "@/app";
import { prisma } from "@/utils/prisma-client";
import request from "supertest";
import { getSetCookies } from "./cookies";

export const TEST_PASSWORD = "password123";

let testPasswordHashPromise: Promise<string> | undefined;

export const getTestPasswordHash = (): Promise<string> => {
  testPasswordHashPromise ??= Bun.password.hash(TEST_PASSWORD, {
    algorithm: "bcrypt",
    cost: 10,
  });
  return testPasswordHashPromise;
};

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
    return { user: existingUser, cls, password: TEST_PASSWORD };
  }

  const hashedPassword = await getTestPasswordHash();

  // Enum role casting if needed, but string works with Prisma types usually if matches enum
  const user = await prisma.user.create({
    data: {
      nim,
      name: `Test Student ${nim}`,
      password: hashedPassword,
      classId: cls.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role: role as any,
    },
  });

  return { user, cls, password: TEST_PASSWORD };
};

export const loginUser = async (nim = "1313624000", role = "user") => {
  const { password } = await createTestUser(nim, role);

  const response = await request(app).post("/api/auth/login").send({
    nim,
    password,
  });

  const cookies = getSetCookies(response.headers);
  const accessTokenCookie = cookies.find((c: string) => c.startsWith("accessToken="));

  if (!accessTokenCookie) {
    throw new Error("Login response did not include an accessToken cookie");
  }

  return accessTokenCookie; // Full cookie string "accessToken=...; Path=/; ..."
};
