const { prisma } = await import('../src/utils/prisma-client.ts');

async function cleanup() {
  console.log('🧹 Cleaning up Mei and Juni 2026 bills...');
  const deleted = await prisma.cashBill.deleteMany({
    where: {
      year: 2026,
      month: { in: [5, 6] },
    },
  });
  console.log(`✅ Deleted ${deleted.count} bills.`);

  // Also cleanup transactions if any were created for these months
  const deletedTx = await prisma.transaction.deleteMany({
    where: {
      description: {
        contains: '05/2026',
      },
    },
  });
  const deletedTx2 = await prisma.transaction.deleteMany({
    where: {
      description: {
        contains: '06/2026',
      },
    },
  });
  console.log(`✅ Deleted ${deletedTx.count + deletedTx2.count} transactions.`);
}

cleanup()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

export {};
