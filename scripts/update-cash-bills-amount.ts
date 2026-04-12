/**
 * Reusable script: Update cash bill amount for a specific month/year.
 *
 * Rules:
 * - Target bills by month, year, and current kasKelas value
 * - Set kasKelas to the new value
 * - Recalculate totalAmount as (biayaAdmin + new kasKelas)
 *
 * Usage examples:
 *   bun scripts/update-cash-bills-amount.ts --month 3 --year 2026 --from 15000 --to 10000
 *   bun scripts/update-cash-bills-amount.ts --month=3 --year=2026 --from=15000 --to=10000 --dry-run
 */

import 'dotenv/config';

type PrismaClientModule = typeof import('../src/utils/prisma-client.ts');

type TargetBill = {
  id: string;
  billId: string;
  status: 'belum_dibayar' | 'menunggu_konfirmasi' | 'sudah_dibayar' | string;
  kasKelas: unknown;
  biayaAdmin: unknown;
  totalAmount: unknown;
};

function parseNumberArg(flag: string): number | undefined {
  const prefixed = `--${flag}=`;
  const byEquals = process.argv.find((arg) => arg.startsWith(prefixed));

  if (byEquals) {
    const value = Number(byEquals.slice(prefixed.length));
    return Number.isFinite(value) ? value : undefined;
  }

  const index = process.argv.findIndex((arg) => arg === `--${flag}`);
  if (index !== -1 && process.argv[index + 1]) {
    const value = Number(process.argv[index + 1]);
    return Number.isFinite(value) ? value : undefined;
  }

  return undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(`--${flag}`);
}

function printHelp(): void {
  console.log('Update cash bills (reusable script)');
  console.log('');
  console.log('Options:');
  console.log('  --month <1-12>     Target month (required)');
  console.log('  --year <YYYY>      Target year (required)');
  console.log('  --from <amount>    Current kasKelas value to match (required)');
  console.log('  --to <amount>      New kasKelas value (required)');
  console.log('  --dry-run          Show matching data without updating');
  console.log('  --help             Show this message');
  console.log('');
  console.log('Example:');
  console.log(
    '  bun scripts/update-cash-bills-amount.ts --month 3 --year 2026 --from 15000 --to 10000'
  );
}

function validateInputs(month: number, year: number, fromAmount: number, toAmount: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Invalid --month. Use an integer from 1 to 12.');
  }

  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    throw new Error('Invalid --year. Use a valid 4-digit year.');
  }

  if (!Number.isFinite(fromAmount) || fromAmount < 0) {
    throw new Error('Invalid --from. Use a positive number.');
  }

  if (!Number.isFinite(toAmount) || toAmount < 0) {
    throw new Error('Invalid --to. Use a positive number.');
  }

  if (fromAmount === toAmount) {
    throw new Error('--from and --to must be different.');
  }
}

function validateRequiredArgs(args: {
  month: number | undefined;
  year: number | undefined;
  from: number | undefined;
  to: number | undefined;
}): asserts args is {
  month: number;
  year: number;
  from: number;
  to: number;
} {
  const missing: string[] = [];

  if (args.month === undefined) missing.push('--month');
  if (args.year === undefined) missing.push('--year');
  if (args.from === undefined) missing.push('--from');
  if (args.to === undefined) missing.push('--to');

  if (missing.length > 0) {
    throw new Error(`Missing required argument(s): ${missing.join(', ')}. Use --help for usage.`);
  }
}

async function updateCashBillsAmount() {
  let prisma: PrismaClientModule['prisma'] | null = null;

  try {
    if (hasFlag('help')) {
      printHelp();
      return;
    }

    const parsedArgs = {
      month: parseNumberArg('month'),
      year: parseNumberArg('year'),
      from: parseNumberArg('from'),
      to: parseNumberArg('to'),
    };

    validateRequiredArgs(parsedArgs);

    const targetMonth = parsedArgs.month;
    const targetYear = parsedArgs.year;
    const fromAmount = parsedArgs.from;
    const toAmount = parsedArgs.to;
    const dryRun = hasFlag('dry-run');

    validateInputs(targetMonth, targetYear, fromAmount, toAmount);

    ({ prisma } = await import('../src/utils/prisma-client.ts'));

    console.log('Starting reusable cash bill update...\n');
    console.log(
      `Target: month=${targetMonth}, year=${targetYear}, kasKelas ${fromAmount} -> ${toAmount}${dryRun ? ' (dry-run)' : ''}`
    );

    const targetBills: TargetBill[] = await prisma.cashBill.findMany({
      where: {
        month: targetMonth,
        year: targetYear,
        kasKelas: fromAmount,
      },
      select: {
        id: true,
        billId: true,
        status: true,
        kasKelas: true,
        biayaAdmin: true,
        totalAmount: true,
      },
    });

    if (targetBills.length === 0) {
      console.log('No matching bills found for the provided filters.');
      return;
    }

    console.log(`Found ${targetBills.length} bill(s) to update.`);

    if (dryRun) {
      const paidCount = targetBills.filter((bill) => bill.status === 'sudah_dibayar').length;
      const pendingCount = targetBills.filter(
        (bill) => bill.status === 'menunggu_konfirmasi'
      ).length;
      const unpaidCount = targetBills.filter((bill) => bill.status === 'belum_dibayar').length;

      console.log('\nDry-run summary:');
      console.log('============================================');
      console.log(`Would update bills    : ${targetBills.length}`);
      console.log(`- sudah_dibayar       : ${paidCount}`);
      console.log(`- menunggu_konfirmasi : ${pendingCount}`);
      console.log(`- belum_dibayar       : ${unpaidCount}`);
      console.log(`kasKelas              : ${fromAmount} -> ${toAmount}`);
      console.log('============================================');
      return;
    }

    // Group by biayaAdmin so we can update many rows at once with the correct totalAmount.
    const groups = new Map<number, string[]>();

    for (const bill of targetBills) {
      const biayaAdmin = Number(bill.biayaAdmin);
      const existing = groups.get(biayaAdmin) ?? [];
      existing.push(bill.id);
      groups.set(biayaAdmin, existing);
    }

    let updatedCount = 0;

    for (const [biayaAdmin, ids] of groups.entries()) {
      const newTotalAmount = biayaAdmin + toAmount;

      const result = await prisma.cashBill.updateMany({
        where: {
          id: { in: ids },
          month: targetMonth,
          year: targetYear,
          kasKelas: fromAmount,
        },
        data: {
          kasKelas: toAmount,
          totalAmount: newTotalAmount,
        },
      });

      updatedCount += result.count;
    }

    const paidCount = targetBills.filter((bill) => bill.status === 'sudah_dibayar').length;
    const pendingCount = targetBills.filter((bill) => bill.status === 'menunggu_konfirmasi').length;
    const unpaidCount = targetBills.filter((bill) => bill.status === 'belum_dibayar').length;

    console.log('\nUpdate Summary:');
    console.log('============================================');
    console.log(`Updated bills       : ${updatedCount}`);
    console.log(`- sudah_dibayar     : ${paidCount}`);
    console.log(`- menunggu_konfirmasi: ${pendingCount}`);
    console.log(`- belum_dibayar     : ${unpaidCount}`);
    console.log(`kasKelas            : ${fromAmount} -> ${toAmount}`);
    console.log('============================================');
    console.log('Done.\n');
  } catch (error) {
    console.error('Failed to update cash bills:', error);
    process.exit(1);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

updateCashBillsAmount();
