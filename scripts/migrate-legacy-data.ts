import pg, { type PoolClient } from "pg";

const TABLES = [
  "classes",
  "users",
  "payment_accounts",
  "transactions",
  "fund_applications",
  "cash_bills",
  "refresh_tokens",
] as const;

const migrationEnabled = process.env.MIGRATE_LEGACY_DATA === "true";

if (!migrationEnabled) {
  console.log("Legacy data migration is disabled; skipping.");
  process.exit(0);
}

const sourceUrl = process.env.LEGACY_DATABASE_URL;
const destinationUrl =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!sourceUrl || !destinationUrl) {
  throw new Error(
    "LEGACY_DATABASE_URL and a destination PostgreSQL URL are required"
  );
}

if (sourceUrl === destinationUrl) {
  throw new Error("Legacy and destination database URLs must be different");
}

const useEncryptedLibpqConnection = (connectionString: string) => {
  const connectionUrl = new URL(connectionString);
  connectionUrl.searchParams.set("sslmode", "require");
  connectionUrl.searchParams.set("uselibpqcompat", "true");
  return connectionUrl.toString();
};

const source = new pg.Pool({
  connectionString: useEncryptedLibpqConnection(sourceUrl),
  max: 1,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 10_000,
  allowExitOnIdle: true,
});

const destination = new pg.Pool({
  connectionString: useEncryptedLibpqConnection(destinationUrl),
  max: 1,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 10_000,
  allowExitOnIdle: true,
});

const quoteIdentifier = (identifier: string) =>
  `"${identifier.replaceAll('"', '""')}"`;

async function getColumns(client: pg.Pool | PoolClient, table: string) {
  const result = await client.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
    [table]
  );

  return result.rows.map((row) => row.column_name);
}

async function copyTable(client: PoolClient, table: string) {
  const [sourceColumns, destinationColumns] = await Promise.all([
    getColumns(source, table),
    getColumns(client, table),
  ]);
  const sourceColumnSet = new Set(sourceColumns);
  const columns = destinationColumns.filter((column) =>
    sourceColumnSet.has(column)
  );

  if (columns.length === 0) {
    throw new Error(`No compatible columns found for ${table}`);
  }

  const quotedColumns = columns.map(quoteIdentifier).join(", ");
  const sourceRows = await source.query<Record<string, unknown>>(
    `SELECT ${quotedColumns} FROM ${quoteIdentifier(table)}`
  );

  const batchSize = 50;
  for (let offset = 0; offset < sourceRows.rows.length; offset += batchSize) {
    const batch = sourceRows.rows.slice(offset, offset + batchSize);
    const values: unknown[] = [];
    const valueGroups = batch.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column]);
        return `$${values.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });

    await client.query(
      `
        INSERT INTO ${quoteIdentifier(table)} (${quotedColumns})
        VALUES ${valueGroups.join(", ")}
        ON CONFLICT DO NOTHING
      `,
      values
    );
  }

  const destinationCount = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(table)}`
  );
  const copiedCount = Number(destinationCount.rows[0]?.count || 0);

  if (copiedCount !== sourceRows.rows.length) {
    throw new Error(
      `${table} verification failed: source=${sourceRows.rows.length}, destination=${copiedCount}`
    );
  }

  console.log(`Migrated ${copiedCount} rows into ${table}.`);
}

let destinationClient: PoolClient | undefined;

try {
  await source.query("SELECT 1");
  destinationClient = await destination.connect();
  await destinationClient.query("BEGIN");

  for (const table of TABLES) {
    await copyTable(destinationClient, table);
  }

  await destinationClient.query("COMMIT");
  console.log("Legacy GalaCash data migration completed and verified.");
} catch (error) {
  if (destinationClient) {
    await destinationClient.query("ROLLBACK").catch(() => undefined);
  }
  throw error;
} finally {
  destinationClient?.release();
  await Promise.all([source.end(), destination.end()]);
}
