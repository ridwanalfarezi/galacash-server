import app from "@/app";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { createTestUser, loginUser } from "../helpers/auth";
import { resetDb } from "../helpers/reset-db";

describe("Fund Applications Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  const validApplication = {
    purpose: "Beli Spidol",
    description: "Spidol habis",
    category: "consumption", // Changed to a valid category from schema (e.g. equipment is not in schema but consumption is)
    // Schema valid: "subscription", "consumption", "competition", "printing", "donation", "other"
    amount: 50000,
  };

  it("should create a fund application successfully", async () => {
    const { user } = await createTestUser();
    const cookie = await loginUser(user.nim);

    const response = await request(app)
      .post("/api/fund-applications")
      .set("Cookie", [cookie])
      .send(validApplication);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.purpose).toBe(validApplication.purpose);
    expect(response.body.data.amount).toBe(validApplication.amount.toString()); // Prisma Decimal comes as string often
    expect(response.body.data.status).toBe("pending");
  });

  it("should list my fund applications", async () => {
    const { user } = await createTestUser();
    const cookie = await loginUser(user.nim);

    // Create one
    await request(app)
      .post("/api/fund-applications")
      .set("Cookie", [cookie])
      .send(validApplication);

    const response = await request(app).get("/api/fund-applications/my").set("Cookie", [cookie]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // Again, check structure. Likely response.body.data.data
    expect(response.body.data.data).toHaveLength(1);
    expect(response.body.data.data[0].purpose).toBe(validApplication.purpose);
  });

  it("should fail validation with invalid category", async () => {
    const { user } = await createTestUser();
    const cookie = await loginUser(user.nim);

    const response = await request(app)
      .post("/api/fund-applications")
      .set("Cookie", [cookie])
      .send({
        ...validApplication,
        category: "invalid_category",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
