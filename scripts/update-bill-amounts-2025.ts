import { prisma } from "../src/utils/prisma-client";

async function main() {
  console.log("Starting bill amount update (Sep 2025 onwards)...");

  const NEW_AMOUNT = 10000;

  // Criteria: year 2025 and month >= 9, OR year > 2025
  const result = await prisma.cashBill.updateMany({
    where: {
      OR: [
        {
          year: 2025,
          month: { gte: 9 },
        },
        {
          year: { gt: 2025 },
        },
      ],
    },
    data: {
      kasKelas: NEW_AMOUNT,
      totalAmount: NEW_AMOUNT,
      updatedAt: new Date(),
    },
  });

  console.log(`Successfully updated ${result.count} bills to Rp ${NEW_AMOUNT}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
