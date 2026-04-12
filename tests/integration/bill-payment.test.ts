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

  const createBill = async (
    userId: string,
    classId: string,
    status = "belum_dibayar",
    month = new Date().getMonth() + 1,
    year = 2026
  ) => {
    return await prisma.cashBill.create({
      data: {
        userId,
        classId,
        billId: `BILL-${userId}-TEST-${Date.now()}`,
        month,
        year,
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

  it("should allow user to pay multiple bills with one proof", async () => {
    const { user, cls } = await createTestUser();
    const cookie = await loginUser(user.nim);

    const firstBill = await createBill(user.id, cls.id, "belum_dibayar", 5);
    const secondBill = await createBill(user.id, cls.id, "belum_dibayar", 6);

    const response = await request(app)
      .post("/api/cash-bills/batch-pay")
      .set("Cookie", [cookie])
      .field("billIds", JSON.stringify([firstBill.id, secondBill.id]))
      .field("paymentMethod", "bank")
      .attach("paymentProof", Buffer.from("dummy"), "proof.png");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.message).toBe("2 tagihan berhasil dibayar");

    const updatedBills = await prisma.cashBill.findMany({
      where: {
        id: {
          in: [firstBill.id, secondBill.id],
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    expect(updatedBills).toHaveLength(2);
    const expectedPrefix = "https://storage.googleapis.com/galacash-bucket/payments/";
    const firstProofUrl = updatedBills[0].paymentProofUrl;
    for (const bill of updatedBills) {
      expect(bill.status).toBe("menunggu_konfirmasi");
      expect(bill.paymentMethod).toBe("bank");
      expect(bill.paymentProofUrl).toBe(firstProofUrl);
      expect(bill.paymentProofUrl).toContain(expectedPrefix);
      expect(bill.paidAt).not.toBeNull();
    }
  });

  it("should reject batch payment when a bill belongs to another user", async () => {
    const { user, cls } = await createTestUser();
    const otherUser = await createTestUser("1313624998");
    const cookie = await loginUser(user.nim);

    const ownBill = await createBill(user.id, cls.id, "belum_dibayar", 7);
    const otherBill = await createBill(otherUser.user.id, otherUser.cls.id, "belum_dibayar", 7);

    const response = await request(app)
      .post("/api/cash-bills/batch-pay")
      .set("Cookie", [cookie])
      .field("billIds", JSON.stringify([ownBill.id, otherBill.id]))
      .field("paymentMethod", "bank")
      .attach("paymentProof", Buffer.from("dummy"), "proof.png");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("AUTHORIZATION_ERROR");

    const [refreshedOwnBill, refreshedOtherBill] = await Promise.all([
      prisma.cashBill.findUnique({ where: { id: ownBill.id } }),
      prisma.cashBill.findUnique({ where: { id: otherBill.id } }),
    ]);

    expect(refreshedOwnBill?.status).toBe("belum_dibayar");
    expect(refreshedOtherBill?.status).toBe("belum_dibayar");
  });

  it("should reject batch payment when one bill is already pending confirmation", async () => {
    const { user, cls } = await createTestUser();
    const cookie = await loginUser(user.nim);

    const pendingBill = await createBill(user.id, cls.id, "menunggu_konfirmasi", 8);
    const unpaidBill = await createBill(user.id, cls.id, "belum_dibayar", 9);

    const response = await request(app)
      .post("/api/cash-bills/batch-pay")
      .set("Cookie", [cookie])
      .field("billIds", JSON.stringify([pendingBill.id, unpaidBill.id]))
      .field("paymentMethod", "bank")
      .attach("paymentProof", Buffer.from("dummy"), "proof.png");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("BUSINESS_LOGIC_ERROR");

    const [refreshedPendingBill, refreshedUnpaidBill] = await Promise.all([
      prisma.cashBill.findUnique({ where: { id: pendingBill.id } }),
      prisma.cashBill.findUnique({ where: { id: unpaidBill.id } }),
    ]);

    expect(refreshedPendingBill?.status).toBe("menunggu_konfirmasi");
    expect(refreshedUnpaidBill?.status).toBe("belum_dibayar");
  });
});
