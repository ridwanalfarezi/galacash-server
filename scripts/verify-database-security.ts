import { Client } from 'pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DIRECT_URL or DATABASE_URL is required.');
}

const expectedTables = [
  'classes',
  'users',
  'refresh_tokens',
  'transactions',
  'fund_applications',
  'cash_bills',
  'payment_accounts',
];

const client = new Client({ connectionString });

try {
  await client.connect();

  const result = await client.query<{ tablename: string; rowsecurity: boolean }>(
    `
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = ANY($1::text[])
      ORDER BY tablename
    `,
    [expectedTables]
  );

  const foundTables = new Set(result.rows.map((row) => row.tablename));
  const missingTables = expectedTables.filter((table) => !foundTables.has(table));
  const unprotectedTables = result.rows
    .filter((row) => !row.rowsecurity)
    .map((row) => row.tablename);

  if (missingTables.length > 0 || unprotectedTables.length > 0) {
    throw new Error(
      [
        missingTables.length > 0 ? `missing tables: ${missingTables.join(', ')}` : '',
        unprotectedTables.length > 0
          ? `RLS disabled: ${unprotectedTables.join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('; ')
    );
  }

  console.log(`Verified RLS on all ${expectedTables.length} application tables.`);
} finally {
  await client.end();
}
