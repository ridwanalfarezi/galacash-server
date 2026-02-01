import app from "@/app";
import { prisma } from "@/utils/prisma-client";
import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import { loginUser, createTestUser } from "../helpers/auth";
import { resetDb } from "../helpers/reset-db";

describe("Cash Bills Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("should get list of my bills", async () => {
    const { user, cls } = await createTestUser();
    const cookie = await loginUser(user.nim);

    // Create a bill
    await prisma.cashBill.create({
      data: {
        userId: user.id,
        classId: cls.id,
        billId: `BILL-${user.nim}-01-2026`,
        month: 1,
        year: 2026,
        dueDate: new Date("2026-01-31"),
        kasKelas: 15000,
        biayaAdmin: 0,
        totalAmount: 15000,
        status: "belum_dibayar",
      },
    });

    const response = await request(app)
      .get("/api/cash-bills/my")
      .set("Cookie", [cookie]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // The response data has a 'data' property containing the array
    expect(response.body.data.data).toHaveLength(1);
    expect(response.body.data.data[0].totalAmount).toBe("15000");
  });

  it("should get a specific bill by ID", async () => {
    const { user, cls } = await createTestUser();
    const cookie = await loginUser(user.nim);

    const bill = await prisma.cashBill.create({
      data: {
        userId: user.id,
        classId: cls.id,
        billId: `BILL-${user.nim}-02-2026`,
        month: 2,
        year: 2026,
        dueDate: new Date("2026-02-28"),
        kasKelas: 15000,
        biayaAdmin: 0,
        totalAmount: 15000,
        status: "belum_dibayar",
      },
    });

    const response = await request(app)
      .get(`/api/cash-bills/${bill.id}`)
      .set("Cookie", [cookie]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(bill.id);
  });

  it("should return 404 for non-existent bill", async () => {
    const { user } = await createTestUser();
    const cookie = await loginUser(user.nim);

    // If route validator checks UUID, pass a valid UUID that doesn't exist
    const randomUuid = "00000000-0000-0000-0000-000000000000";
    const response2 = await request(app)
      .get(`/api/cash-bills/${randomUuid}`)
      .set("Cookie", [cookie]);

    expect(response2.status).toBe(404);
  });
});
