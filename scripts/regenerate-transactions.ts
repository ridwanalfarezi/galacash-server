import { TransactionCategory, TransactionType } from "../src/prisma/generated/client";
import { prisma } from "../src/utils/prisma-client";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

async function main() {
  console.log("Starting transaction regeneration...");

  // 1. Clear existing data
  console.log("Clearing existing FundApplications...");
  await prisma.fundApplication.deleteMany({});

  console.log("Clearing existing Transactions...");
  await prisma.transaction.deleteMany({});

  // 2. Fetch paid bills
  console.log("Fetching paid CashBills...");
  const paidBills = await prisma.cashBill.findMany({
    where: {
      status: "sudah_dibayar",
    },
    include: {
      user: true,
    },
  });

  console.log(`Found ${paidBills.length} paid bills. Regenerating transactions...`);

  let count = 0;
  for (const bill of paidBills) {
    if (!bill.user) {
      console.warn(`Bill ${bill.id} has no user attached. Skipping.`);
      continue;
    }

    const monthName = MONTH_NAMES[bill.month - 1]; // month is 1-12
    const description = `Kas-${monthName} ${bill.year}: ${bill.user.name}`;

    // Use fixed date in the bill month (e.g., 5th) to ensure it appears in correct month report
    // bill.month is 1-12
    const date = new Date(Date.UTC(bill.year, bill.month - 1, 5));

    await prisma.transaction.create({
      data: {
        classId: bill.classId,
        type: TransactionType.income,
        category: TransactionCategory.kas_kelas,
        amount: bill.totalAmount,
        description: description,
        date: date,
      },
    });
    count++;
  }

  console.log(`Successfully regenerated ${count} transactions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // using shared prisma instance which handles disconnect if needed, but for script we exit
    process.exit(0);
  });
