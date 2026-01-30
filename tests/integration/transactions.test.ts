import app from "@/app";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { loginUser } from "../helpers/auth";
import { resetDb } from "../helpers/reset-db";

describe("Transactions Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  const transactionData = {
    date: new Date().toISOString(),
    description: "Buying markers",
    type: "expense",
    amount: 50000,
    category: "office_supplies",
  };

  it("should allow bendahara to create a transaction", async () => {
    // 1313624999 is a distinct NIM to assume bendahara
    const cookie = await loginUser("1313624999", "bendahara");

    const response = await request(app)
      .post("/api/bendahara/transactions")
      .set("Cookie", [cookie])
      .field("date", transactionData.date)
      .field("description", transactionData.description)
      .field("type", transactionData.type)
      .field("amount", transactionData.amount)
      .field("category", transactionData.category)
      .attach("attachment", Buffer.from("dummy"), "test.png"); // Use .png extension to pass validation

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.amount).toBe("50000"); // Decimal often returned as string
    expect(response.body.data.type).toBe("expense");
  });

  it("should list transactions", async () => {
    const cookie = await loginUser("1313624999", "bendahara");

    // Create a transaction first
    await request(app)
      .post("/api/bendahara/transactions")
      .set("Cookie", [cookie])
      .field("date", transactionData.date)
      .field("description", transactionData.description)
      .field("type", transactionData.type)
      .field("amount", transactionData.amount)
      .field("category", transactionData.category)
      .attach("attachment", Buffer.from("dummy"), "test.png"); // Use .png extension

    const response = await request(app).get("/api/transactions").set("Cookie", [cookie]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.data).toHaveLength(1);
    expect(response.body.data.data[0].description).toBe(transactionData.description);
  });

  it("should fail if regular user tries to create transaction", async () => {
    const cookie = await loginUser("1313624000", "user");

    const response = await request(app)
      .post("/api/bendahara/transactions")
      .set("Cookie", [cookie])
      .send(transactionData);

    // Should be 403 Forbidden or 401/404 depending on how router handles middleware
    // requireBendahara middleware typically returns 403
    expect(response.status).toBe(403);
  });
});
