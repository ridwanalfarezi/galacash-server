import app from "@/app";
import { prisma } from "@/utils/prisma-client";
import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import { loginUser, createTestUser } from "../helpers/auth";
import { resetDb } from "../helpers/reset-db";

describe("Bendahara Operations Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  const createFundApplication = async (userId: string, classId: string) => {
    return await prisma.fundApplication.create({
      data: {
        userId,
        classId,
        purpose: "Class Event",
        category: "competition",
        amount: 100000,
        status: "pending",
      },
    });
  };

  it("should allow bendahara to approve a fund application", async () => {
    const { user, cls } = await createTestUser();
    const appData = await createFundApplication(user.id, cls.id);

    const cookie = await loginUser("1313624999", "bendahara");

    const response = await request(app)
      .post(`/api/bendahara/fund-applications/${appData.id}/approve`)
      .set("Cookie", [cookie]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("approved");
  });

  it("should allow bendahara to reject a fund application", async () => {
    const { user, cls } = await createTestUser();
    const appData = await createFundApplication(user.id, cls.id);

    const cookie = await loginUser("1313624999", "bendahara");

    const response = await request(app)
      .post(`/api/bendahara/fund-applications/${appData.id}/reject`)
      .set("Cookie", [cookie])
      .send({ rejectionReason: "Budget too high" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("rejected");
    expect(response.body.data.rejectionReason).toBe("Budget too high");
  });

  it("should fail rejection without reason", async () => {
    const { user, cls } = await createTestUser();
    const appData = await createFundApplication(user.id, cls.id);

    const cookie = await loginUser("1313624999", "bendahara");

    const response = await request(app)
      .post(`/api/bendahara/fund-applications/${appData.id}/reject`)
      .set("Cookie", [cookie])
      .send({}); // Missing rejectionReason

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
