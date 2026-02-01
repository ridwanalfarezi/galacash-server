/**
 * Seed Expense Transactions Script
 * Creates Transaction records for various class expenses
 *
 * Usage:
 *   bun run seed:expenses
 */

import "dotenv/config";

// Use dynamic import to avoid module resolution issues
const { prisma } = await import("../src/utils/prisma-client.ts");

// Expense data structure
interface ExpenseData {
  date: Date;
  description: string;
  amount: number;
  category: string;
}

const expenses: ExpenseData[] = [
  {
    date: new Date("2024-09-21"),
    description: "Zoom Premium Bulanan",
    amount: 25000,
    category: "subscription",
  },
  {
    date: new Date("2024-10-08"),
    description: "Print KRS",
    amount: 123000,
    category: "printing",
  },
  {
    date: new Date("2024-10-21"),
    description: "Zoom Premium Bulanan",
    amount: 40000,
    category: "subscription",
  },
  {
    date: new Date("2024-11-12"),
    description: "Futsal",
    amount: 145000,
    category: "competition",
  },
  {
    date: new Date("2024-11-20"),
    description: "Zoom Premium Bulanan",
    amount: 80000,
    category: "subscription",
  },
  {
    date: new Date("2024-11-24"),
    description: "Konsum Kumpul Angkatan",
    amount: 156000,
    category: "social",
  },
  {
    date: new Date("2024-12-05"),
    description: "Futsal Dekan Cup",
    amount: 175000,
    category: "competition",
  },
  {
    date: new Date("2024-12-05"),
    description: "ML Dekan Cup",
    amount: 75000,
    category: "competition",
  },
  {
    date: new Date("2024-12-14"),
    description: "Badmin Dekan Cup",
    amount: 50000,
    category: "competition",
  },
  {
    date: new Date("2024-12-18"),
    description: "Print Cheatsheet Kaldif",
    amount: 45000,
    category: "printing",
  },
  {
    date: new Date("2024-12-30"),
    description: "Kas Fakultas",
    amount: 830000,
    category: "other",
  },
  {
    date: new Date("2025-03-02"),
    description: "Zoom Premium Bulanan",
    amount: 80000,
    category: "subscription",
  },
  {
    date: new Date("2025-03-07"),
    description: "Anjangsana Galaphonix",
    amount: 120000,
    category: "social",
  },
  {
    date: new Date("2025-03-19"),
    description: "Bukber Angkatan",
    amount: 240000,
    category: "social",
  },
  {
    date: new Date("2025-03-24"),
    description: "Donasi Kemanusiaan",
    amount: 200000,
    category: "social",
  },
  {
    date: new Date("2025-04-07"),
    description: "Zoom Premium Bulanan",
    amount: 80000,
    category: "subscription",
  },
  {
    date: new Date("2025-04-30"),
    description: "Cheatsheet Kalin",
    amount: 30000,
    category: "education",
  },
  {
    date: new Date("2025-05-11"),
    description: "Zoom Premium Bulanan",
    amount: 80000,
    category: "subscription",
  },
  {
    date: new Date("2025-06-24"),
    description: "Konsum Galameet",
    amount: 194000,
    category: "social",
  },
  {
    date: new Date("2025-08-23"),
    description: "Sewa Ruangan Day 1 PKKMB",
    amount: 150000,
    category: "other",
  },
  {
    date: new Date("2025-08-28"),
    description: "Zoom Premium Bulanan",
    amount: 61000,
    category: "subscription",
  },
  {
    date: new Date("2025-11-17"),
    description: "Lomba",
    amount: 75000,
    category: "competition",
  },
  {
    date: new Date("2025-12-12"),
    description: "Zoom Premium Bulanan",
    amount: 200000,
    category: "subscription",
  },
];

async function seedExpenseTransactions() {
  try {
    console.log("🚀 Starting expense transactions seeding...\n");

    // Get class A
    const classA = await prisma.class.findUnique({
      where: { name: "A" },
    });

    if (!classA) {
      throw new Error("Class A not found");
    }

    let totalExpensesCreated = 0;
    let totalExpenseAmount = 0;

    for (const expense of expenses) {
      try {
        // Create unique transaction ID for upsert
        const transactionKey = `${expense.date.toISOString().split("T")[0]}-${expense.description}`;

        // Check if this transaction already exists
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            description: expense.description,
            classId: classA.id,
            date: expense.date,
          },
        });

        if (!existingTransaction) {
          const transaction = await prisma.transaction.create({
            data: {
              classId: classA.id,
              type: "expense",
              category: expense.category as any,
              description: expense.description,
              amount: expense.amount,
              date: expense.date,
            },
          });

          totalExpensesCreated++;
          totalExpenseAmount += expense.amount;

          console.log(
            `✅ Created expense: ${expense.description} - Rp ${expense.amount.toLocaleString("id-ID")}`
          );
        } else {
          console.log(`⏭️  Skipped (already exists): ${expense.description}`);
        }
      } catch (error) {
        console.error(`❌ Error creating expense for ${expense.description}:`, error);
      }
    }

    // Summary
    console.log("\n📊 Summary:");
    console.log("============================================");
    console.log(`Expenses Created: ${totalExpensesCreated}`);
    console.log(`Total Expense Amount: Rp ${totalExpenseAmount.toLocaleString("id-ID")}`);
    console.log("============================================");
    console.log("✅ Expense transactions seeding completed!\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

seedExpenseTransactions();
