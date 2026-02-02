import app from "@/app";
import { prisma } from "@/utils/prisma-client";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestUser, loginUser } from "../helpers/auth";
import { resetDb } from "../helpers/reset-db";

describe("Bill Payment Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  const createBill = async (userId: string, classId: string, status = "belum_dibayar") => {
    return await prisma.cashBill.create({
      data: {
        userId,
        classId,
        billId: `BILL-${userId}-TEST-${Date.now()}`,
        month: new Date().getMonth() + 1,
        year: 2026,
        dueDate: new Date("2026-02-28"),
        kasKelas: 15000,
        biayaAdmin: 0,
        totalAmount: 15000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: status as any,
      },
    });
  };

  it("should allow user to pay a bill", async () => {
    const { user, cls } = await createTestUser();
    const cookie = await loginUser(user.nim);
    const bill = await createBill(user.id, cls.id);

    const response = await request(app)
      .post(`/api/cash-bills/${bill.id}/pay`)
      .set("Cookie", [cookie])
      .field("paymentMethod", "bank")
      .attach("paymentProof", Buffer.from("dummy"), "proof.png");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("menunggu_konfirmasi");
  });

  it("should allow bendahara to confirm a payment", async () => {
    // User pays first
    const { user, cls } = await createTestUser();
    const userCookie = await loginUser(user.nim);
    const bill = await createBill(user.id, cls.id);

    await request(app)
      .post(`/api/cash-bills/${bill.id}/pay`)
      .set("Cookie", [userCookie])
      .field("paymentMethod", "bank")
      .attach("paymentProof", Buffer.from("dummy"), "proof.png");

    // Bendahara login
    const bendaharaCookie = await loginUser("1313624999", "bendahara");

    // Confirm
    const response = await request(app)
      .post(`/api/bendahara/cash-bills/${bill.id}/confirm-payment`)
      .set("Cookie", [bendaharaCookie]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("sudah_dibayar");
  });

  it("should allow bendahara to reject a payment", async () => {
    // User pays first
    const { user, cls } = await createTestUser();
    const userCookie = await loginUser(user.nim);
    const bill = await createBill(user.id, cls.id);

    await request(app)
      .post(`/api/cash-bills/${bill.id}/pay`)
      .set("Cookie", [userCookie])
      .field("paymentMethod", "bank")
      .attach("paymentProof", Buffer.from("dummy"), "proof.png");

    // Bendahara login
    const bendaharaCookie = await loginUser("1313624999", "bendahara");

    // Reject
    const response = await request(app)
      .post(`/api/bendahara/cash-bills/${bill.id}/reject-payment`)
      .set("Cookie", [bendaharaCookie])
      .send({ reason: "Bukti tidak jelas" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("belum_dibayar");
    expect(response.body.data.paymentProofUrl).toBeNull();
  });
});
