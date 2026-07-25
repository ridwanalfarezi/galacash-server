# GalaCash Server

GalaCash Server is the Express API for GalaCash, a financial-management system
for students (`user`) and treasurers (`bendahara`). It manages authentication,
transactions, fund applications, monthly cash bills, payment accounts,
dashboards, recaps, exports, uploads, and scheduled bill generation.

## Current stack

- Bun 1.2.14 and TypeScript
- Express 5
- Supabase PostgreSQL
- Prisma 7 with the generated client in `src/prisma/generated`
- Redis through ioredis for caches, token state, rate limiting, and
  correctness locks
- Joi request validation
- httpOnly-cookie JWT authentication with stored rotating refresh tokens
- Supabase Storage for persisted uploads
- Winston logging, Helmet, and Express rate limiting
- Swagger UI backed by `openapi.yaml`
- Bun's test runner and Supertest

## Architecture

```text
request
  -> route middleware
  -> controller
  -> service
  -> repository or transaction-scoped Prisma
  -> PostgreSQL
  -> post-commit cache invalidation
  -> response envelope
```

Layer responsibilities:

- Routes compose rate limiting, authentication, role checks, validation, and
  upload middleware.
- Controllers adapt HTTP input and output.
- Services own business rules, ownership, state transitions, atomic workflows,
  and cache coordination.
- Repositories own reusable persistence queries and pagination.
- Services may use Prisma directly for interactive multi-entity transactions
  and specialized aggregates.

Important financial invariants:

- Confirming a cash bill and creating its `income / kas_kelas` transaction are
  one database transaction.
- Approving a fund application and creating its expense transaction are one
  database transaction.
- Batch bill submission updates all selected bills atomically.
- Financial cache invalidation happens after commit and covers list and
  aggregate projections.
- Personal bills and applications enforce ownership. Several transaction,
  chart, balance, student, and recap views intentionally support cross-class
  transparency.

Detailed maintenance guidance lives in [AGENTS.md](AGENTS.md) and `.ai/`.

## Local setup

### Prerequisites

- Bun 1.2.14
- Docker Desktop or Docker Engine with Compose
- Git

### Install

```bash
git clone https://github.com/ridwanalfarezi/galacash-server.git
cd galacash-server
bun install
```

Copy `.env.example` to `.env` and set development values. For the included
Compose services, the core values are:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://galacash:galacash123@localhost:5433/galacash_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-at-least-32-random-characters
JWT_REFRESH_SECRET=replace-with-at-least-32-random-characters
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
USE_LOCAL_CRON=true
```

Do not commit real credentials. Supabase Storage variables are required when
testing persisted uploads locally.

### Start infrastructure and apply migrations

```bash
docker compose up -d --wait
bun run prisma:generate
bun run prisma:deploy
```

Seed data only when explicitly needed:

```bash
bun run seed
```

Start the API:

```bash
bun run dev
```

Local endpoints:

- API: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api/docs`
- Health check: `http://localhost:3000/health`

## Testing

### Unit and contract tests

```bash
bun run test:unit
bun run test:contract
```

The contract test enforces exact HTTP method/path parity between executable
routes and `openapi.yaml`.

Run every suite in isolated Bun processes with:

```bash
bun run test
```

Do not replace this with plain `bun test`: unit-level `mock.module()`
declarations can otherwise leak into integration files in the same process.

### Docker-backed integration tests

The recommended fresh integration workflow starts isolated PostgreSQL and Redis
services, waits for health, deploys committed migrations using `.env.test`, and
runs the integration suite:

```bash
bun run test:integration:docker
```

Test infrastructure uses PostgreSQL on port `5434` and Redis on port `6380`.
PostgreSQL storage is a temporary `tmpfs`.

Stop the isolated services when finished:

```bash
bun run test:down
```

If the services are already running:

```bash
bun run test:migrate
bun run test:integration
```

### Full local verification

```bash
bun run type-check
bun run type-check:tests
bun run lint
bun run test:unit
bun run test:integration:docker
bun run test:contract
bun run build
```

## Authentication and authorization

- Login verifies the password with `Bun.password`.
- Access tokens last one hour; refresh tokens last seven days.
- Both tokens are returned in httpOnly cookies. Access tokens also support a
  Bearer fallback for authenticated requests.
- Refresh rotates the stored refresh token.
- Logout deletes the presented refresh token, blacklists the presented access
  token for its remaining lifetime, and clears cookies.
- Revoke-all deletes every refresh token for the user and increments
  `tokenVersion`.
- `requireBendahara` allows only `bendahara`.
- `requireUser` currently allows both authenticated roles.

Authentication and ownership must fail closed. Never return or log passwords,
tokens, secrets, or production stack traces.

## Redis behavior

Redis has two availability contracts:

- Ordinary cache operations degrade to misses or no-ops, allowing PostgreSQL to
  remain authoritative.
- Distributed locks fail closed. Bill payment submission and monthly bill
  generation do not proceed without a successfully acquired lock.

Locks use a unique fencing token and compare-and-delete release. The pure lock
algorithm is in `src/utils/redis-lock.ts`; `src/config/redis.config.ts` adapts
the production Redis client to it.

## Uploads

The shared upload middleware accepts JPEG, PNG, WebP, and PDF files up to
4 MB, leaving room below Vercel's 4.5 MB request limit. Extension and declared
MIME checks reject obvious mismatches, but
magic-byte validation is the authoritative content-type gate.

Required uploads fail outside tests when storage is unavailable. In tests, the
middleware can provide deterministic `mock://test-uploads/...` URLs without
requiring Supabase.

## Monthly bill generation

- Schedule: `BILL_GENERATION_SCHEDULE`, default `0 0 1 * *`
- Amount: `KAS_KELAS_AMOUNT`, default `10000`
- Break months: January, February, July, and August
- Processing batch size: 100 users
- Duplicate protection: month-scoped Redis lock plus database uniqueness

Local cron runs only when `USE_LOCAL_CRON=true`. Vercel Cron invokes
`GET /api/cron/generate-bills` and authenticates with `CRON_SECRET`. An
authenticated `POST` remains available for manual runs.

## API contract

`openapi.yaml` is the published contract and must change with external routes,
payloads, responses, errors, authentication, or enums.

API modules:

- `/api/auth`
- `/api/users`
- `/api/dashboard`
- `/api/transactions`
- `/api/fund-applications`
- `/api/cash-bills`
- `/api/payment-accounts`
- `/api/labels`
- `/api/bendahara`
- `/api/cron`

Use Swagger UI for exact methods, parameters, schemas, and examples.

## Project layout

```text
src/
  config/            Redis, storage, and environment configuration
  controllers/       HTTP adapters
  jobs/              monthly bill generation
  middlewares/       auth, validation, rate limiting, and uploads
  repositories/      reusable database access
  routes/            API route composition
  services/          business workflows and cache coordination
  utils/             Prisma, locks, logging, responses, tokens, and errors
  prisma/generated/  generated Prisma client; never edit manually
prisma/
  migrations/        committed database migrations
  schema.prisma      database schema
tests/
  unit/              isolated validators, middleware, cache, and lock tests
  integration/       PostgreSQL/Redis-backed API and service tests
  contract/          route/OpenAPI parity
openapi.yaml         published API contract
```

## Scripts

| Command                           | Purpose                                                  |
| --------------------------------- | -------------------------------------------------------- |
| `bun run dev`                     | Start the API with watch mode                            |
| `bun run start`                   | Start the API                                            |
| `bun run start:prod`              | Deploy migrations and start the API                      |
| `bun run build`                   | Generate Prisma, compile TypeScript, and resolve aliases |
| `bun run build:binary`            | Build a standalone Bun executable                        |
| `bun run type-check`              | Type-check application sources                           |
| `bun run type-check:tests`        | Type-check test sources                                  |
| `bun run lint`                    | Run ESLint                                               |
| `bun run lint:fix`                | Apply ESLint fixes                                       |
| `bun run format`                  | Format source files                                      |
| `bun run prisma:generate`         | Generate the Prisma client                               |
| `bun run prisma:migrate`          | Create/apply a development migration                     |
| `bun run prisma:deploy`           | Apply committed migrations                               |
| `bun run prisma:studio`           | Open Prisma Studio                                       |
| `bun run seed`                    | Run the main seed script with Bun                        |
| `bun run test:unit`               | Run isolated unit tests                                  |
| `bun run test:integration`        | Run integration tests against configured services        |
| `bun run test:integration:docker` | Start services, migrate, and run integration tests       |
| `bun run test:contract`           | Check route/OpenAPI parity                               |
| `bun run test`                    | Run all suites in separate Bun processes                 |
| `bun run test:up`                 | Start isolated test services                             |
| `bun run test:down`               | Stop isolated test services                              |
| `bun run test:migrate`            | Deploy migrations using `.env.test`                      |

## Deployment

The production API is configured for Vercel's Bun runtime in `vercel.json`.
Create a separate Vercel project rooted at this repository and configure the
variables from `.env.example`.

Use the Supabase transaction-pooler URL (port `6543`) for `DATABASE_URL` and
the direct or session-pooler URL (port `5432`) for `DIRECT_URL`. Apply
migrations before the first deployment:

```bash
bun run build
bun run prisma:deploy
```

Create a public Supabase Storage bucket matching `SUPABASE_STORAGE_BUCKET`
(the template uses `galacash`). Keep `SUPABASE_SECRET_KEY`, database URLs,
Redis credentials, and JWT secrets in Vercel's server-side environment
settings. Never prefix backend secrets with `VITE_`.

`Dockerfile` and `Dockerfile.binary` remain available for local or
container-based deployments.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

ISC. See [LICENSE](LICENSE).
