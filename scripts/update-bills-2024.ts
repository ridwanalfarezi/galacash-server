import { BillStatus, PaymentMethod } from "../src/prisma/generated/client";
import { prisma } from "../src/utils/prisma-client";

async function main() {
  console.log("Starting bill update for Sep-Dec 2024...");

  const months = [9, 10, 11, 12];
  const year = 2024;

  let totalUpdated = 0;

  for (const month of months) {
    console.log(`Updating bills for month ${month}/${year}...`);

    // Set payment date to 5th of the month
    const paidAt = new Date(Date.UTC(year, month - 1, 5));

    const result = await prisma.cashBill.updateMany({
      where: {
        month: month,
        year: year,
        status: {
          not: BillStatus.sudah_dibayar,
        },
      },
      data: {
        status: BillStatus.sudah_dibayar,
        paymentMethod: PaymentMethod.cash,
        paidAt: paidAt,
        updatedAt: new Date(),
      },
    });

    console.log(`Updated ${result.count} bills for month ${month}.`);
    totalUpdated += result.count;
  }

  console.log(`Total bills updated: ${totalUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
