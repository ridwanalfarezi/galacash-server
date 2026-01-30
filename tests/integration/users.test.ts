import app from "@/app";
import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import { loginUser, createTestUser } from "../helpers/auth";
import { resetDb } from "../helpers/reset-db";

describe("User Management Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("should allow user to update their profile", async () => {
    const { user } = await createTestUser();
    const cookie = await loginUser(user.nim);

    const response = await request(app)
      .put("/api/users/profile")
      .set("Cookie", [cookie])
      .send({
        name: "Updated Name",
        email: "updated@example.com",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe("Updated Name");
    expect(response.body.data.email).toBe("updated@example.com");
  });

  it("should prevent regular user from accessing bendahara routes", async () => {
    const { user } = await createTestUser();
    const cookie = await loginUser(user.nim, "user");

    const response = await request(app)
      .get("/api/bendahara/dashboard")
      .set("Cookie", [cookie]);

    // Expect 403 Forbidden or 401 Unauthorized
    expect([401, 403]).toContain(response.status);
    expect(response.body.success).toBe(false);
  });

  it("should allow bendahara to access bendahara routes", async () => {
    const cookie = await loginUser("1313624999", "bendahara");

    const response = await request(app)
      .get("/api/bendahara/dashboard")
      .set("Cookie", [cookie]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
