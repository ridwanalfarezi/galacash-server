import app from "@/app";
import { prisma } from "@/utils/prisma-client";
import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import { resetDb } from "../helpers/reset-db";

describe("Auth Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  const createTestUser = async () => {
    const cls = await prisma.class.create({
      data: {
        name: "Test Class A",
      },
    });

    const hashedPassword = await Bun.password.hash("password123", {
      algorithm: "bcrypt",
      cost: 10,
    });

    const user = await prisma.user.create({
      data: {
        nim: "1313624000",
        name: "Test Student",
        password: hashedPassword,
        classId: cls.id,
        role: "user",
      },
    });

    return { user, cls };
  };

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      await createTestUser();

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          nim: "1313624000",
          password: "password123",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Access token is in cookie, not body
      // expect(response.body.data).toHaveProperty("accessToken");
      expect(response.body.data.user.nim).toBe("1313624000");
      // Check cookie
      expect(response.headers["set-cookie"]).toBeDefined();
      const cookies = response.headers["set-cookie"].map((c: string) => c.split(";")[0]);
      expect(cookies.some((c: string) => c.startsWith("accessToken="))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
    });

    it("should fail with invalid password", async () => {
      await createTestUser();

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          nim: "1313624000",
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should fail with non-existent user", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          nim: "1313699999",
          password: "password123",
        });

      expect(response.status).toBe(401); // Or 404 depending on implementation, usually 401 for security
    });
  });
});
