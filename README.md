# GalaCash Server

> **Financial management API for class treasurers**  
> Built with Bun, Express, TypeScript, PostgreSQL, Redis, and GCP Cloud Storage  
> **Last Updated:** June 16, 2026

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

GalaCash is a comprehensive backend API for managing class finances. It provides two user roles:

- **Students (user)**: View transactions, submit fund applications, pay monthly bills
- **Treasurer (bendahara)**: Manage all finances, approve applications, confirm payments

### Architecture

**Multi-Class Transparency Model**: As of January 2026, both users and bendahara can view data across **all classes** within the same angkatan (batch). The `classId` field is retained for organizational purposes and future filtering capabilities.

### Key Features

✅ **Authentication**: NIM + Password with JWT tokens  
✅ **Fund Applications (Aju Dana)**: Submit and review funding requests  
✅ **Cash Bills (Tagihan Kas)**: Automated monthly bill generation  
✅ **Transactions**: Track income and expenses across all classes  
✅ **Financial Reports (Rekap Kas)**: Comprehensive batch-level financial summaries  
✅ **File Uploads**: GCP Cloud Storage with magic-byte validation — file content verified against binary signatures, not attacker-supplied headers  
✅ **Caching**: Redis with full cache invalidation strategy — mutations evict all derived views  
✅ **ACID Transactions**: Prisma Interactive Transactions wrap every multi-step financial mutation  
✅ **Idempotent Cron**: Redis distributed lock prevents duplicate bill generation under GCP at-least-once delivery  
✅ **Auto-transactions**: Bills and approvals auto-create transactions  
✅ **Data Transparency**: Aggregated views across all classes in a batch  
✅ **Payment Accounts**: Manage bank accounts and e-wallets for treasury  
✅ **Transaction Labels**: Organize transactions with custom labels  
✅ **Export Reports**: Generate Excel reports for financial summaries

---

## 🛠️ Tech Stack

| Technology             | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| **Bun 1.x**            | Runtime environment (Node.js compatible)         |
| **Express.js 5.x**     | Web framework                                    |
| **TypeScript**         | Type safety                                      |
| **PostgreSQL 16**      | Primary database                                 |
| **Prisma v7**          | ORM and migrations (with prisma-client provider) |
| **@prisma/adapter-pg** | PostgreSQL adapter for Prisma                    |
| **Redis (ioredis)**    | Caching layer                                    |
| **JWT**                | Authentication (HS256)                           |
| **GCP Cloud Storage**  | File uploads                                     |
| **Winston**            | Logging                                          |
| **Joi**                | Input validation                                 |
| **node-cron**          | Scheduled jobs                                   |
| **Helmet**             | Security headers                                 |
| **Express Rate Limit** | Rate limiting (with Redis store)                 |
| **Swagger UI**         | API documentation                                |
| **ExcelJS**            | Export financial reports                         |
| **Docker**             | Containerization                                 |

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Bun** v1.x or higher ([Install](https://bun.sh/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com/))

Optional:

- **GCP Account** (for file uploads - can be configured later)

> **Note:** This project uses **Bun** as the runtime, which is a faster alternative to Node.js with full compatibility.

---

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/ridwanalfarezi/galacash-server.git
cd galacash-server
```

### 2. Install dependencies

```bash
bun install
# or using bun directly
bun install
```

### 3. Start Docker services

Start PostgreSQL and Redis:

```bash
docker-compose up -d
```

Verify services are running:

```bash
docker-compose ps
```

### 4. Set up environment variables

The `.env` file is already created for development. For production, copy and customize:

```bash
cp .env.example .env.production
```

### 5. Initialize database

Run migrations and seed data:

```bash
# Generate Prisma Client
bun prisma:generate

# Run database migrations
bun prisma:migrate

# Seed database with test data (automatic via migrations)
bun prisma:migrate
```

This will create:

- 2 classes (A, B)
- 83 students (40 in A, 43 in B)
- 1 bendahara (treasurer): NIM 1313624000
- Default password for all users: `12345678`

### Additional Seeding Scripts

Optional scripts for testing and development:

```bash
# Seed past cash bills (historical data)
bun run seed:past-bills

# Seed expense transactions
bun run seed:expenses

# Clean all data (⚠️ destroys all data)
bun run clean:data
```

### 6. Start development server

```bash
bun dev
```

The server will start on `http://localhost:3000`

Access:

- **API Base:** `http://localhost:3000/api`
- **API Docs:** `http://localhost:3000/api/docs`
- **Health Check:** `http://localhost:3000/health`

🎉 **You're ready!**

---

## 📁 Project Structure

```
galacash-server/
├── src/
│   ├── config/              # Configuration files
│   │   ├── redis.config.ts
│   │   ├── storage.config.ts
│   │   └── multer.config.ts
│   ├── controllers/         # HTTP request handlers
│   │   ├── auth.controller.ts
│   │   ├── bendahara.controller.ts
│   │   ├── cash-bill.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── fund-application.controller.ts
│   │   ├── labels.controller.ts
│   │   ├── payment-account.controller.ts
│   │   ├── transaction.controller.ts
│   │   └── user.controller.ts
│   ├── routes/              # API route definitions
│   │   ├── auth.routes.ts
│   │   ├── bendahara.routes.ts
│   │   ├── cash-bill.routes.ts
│   │   ├── cron.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── fund-application.routes.ts
│   │   ├── labels.routes.ts
│   │   ├── payment-account.routes.ts
│   │   ├── transaction.routes.ts
│   │   └── user.routes.ts
│   ├── services/            # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── bendahara.service.ts
│   │   ├── cache.service.ts
│   │   ├── cash-bill.service.ts
│   │   ├── export.service.ts
│   │   ├── fund-application.service.ts
│   │   ├── payment-account.service.ts
│   │   ├── refresh-token.service.ts
│   │   ├── transaction.service.ts
│   │   └── user.service.ts
│   ├── repositories/        # Data access layer
│   │   ├── cash-bill.repository.ts
│   │   ├── fund-application.repository.ts
│   │   ├── payment-account.repository.ts
│   │   ├── refresh-token.repository.ts
│   │   ├── transaction.repository.ts
│   │   └── user.repository.ts
│   ├── middlewares/         # Express middlewares
│   │   ├── auth.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── validator.middleware.ts
│   ├── validators/          # Input validation schemas
│   │   └── schemas.ts
│   ├── utils/               # Utilities and helpers
│   │   ├── errors/          # Error handling & codes
│   │   ├── logger.ts        # Winston logger
│   │   └── prisma-client.ts # Prisma singleton with adapter
│   ├── types/               # TypeScript type definitions
│   ├── jobs/                # Scheduled tasks
│   │   └── bill-generator.job.ts
│   ├── prisma/generated/    # Auto-generated Prisma Client
│   ├── app.ts               # Express app configuration
│   └── index.ts             # Application entry point
├── prisma/
│   ├── schema.prisma        # Database schema (Prisma v7 format)
│   ├── seed.ts              # Database seeding
│   └── migrations/          # Database migrations
├── scripts/                 # Utility scripts
│   ├── seed-past-cash-bills.ts
│   ├── seed-expense-transactions.ts
│   └── clean-data.ts
├── tests/                   # Test files
├── package.json
├── tsconfig.json
├── bunfig.toml              # Bun configuration
├── Dockerfile               # Production Docker image
├── Dockerfile.binary        # Binary build Docker image
├── cloudbuild.yaml          # GCP Cloud Build config
├── docker-compose.yml       # Local development services
├── openapi.yaml             # OpenAPI 3.0 specification
├── .env.example             # Environment variables template
└── README.md
```

---

## 🔐 Environment Variables

Key environment variables (see `.env.example` for complete list):

| Variable                         | Description                        | Default/Example                                                |
| -------------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| `NODE_ENV`                       | Environment                        | `development`                                                  |
| `PORT`                           | Server port                        | `3000`                                                         |
| `LOG_LEVEL`                      | Winston log level                  | `info`                                                         |
| **Database**                     |                                    |                                                                |
| `DATABASE_URL`                   | PostgreSQL connection string       | `postgresql://galacash:galacash123@localhost:5433/galacash_db` |
| `POSTGRES_URL`                   | Alternative PostgreSQL URL         | Same as DATABASE_URL                                           |
| `PRISMA_DATABASE_URL`            | Prisma Accelerate URL (production) | `prisma+postgres://...`                                        |
| `PRISMA_CLIENT_ENGINE_TYPE`      | Prisma engine type                 | `dataproxy` (for Prisma Accelerate)                            |
| **Redis**                        |                                    |                                                                |
| `REDIS_URL`                      | Redis connection string            | `redis://localhost:6379`                                       |
| **Authentication**               |                                    |                                                                |
| `JWT_SECRET`                     | JWT access token secret            | _Generate with `openssl rand -base64 64`_                      |
| `JWT_REFRESH_SECRET`             | JWT refresh token secret           | _Generate with `openssl rand -base64 64`_                      |
| **GCP Cloud Storage** (Optional) |                                    |                                                                |
| `GCP_PROJECT_ID`                 | Google Cloud project ID            | `your-gcp-project-id`                                          |
| `GCP_BUCKET_NAME`                | GCS bucket name                    | `galacash-bucket`                                              |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account key    | `/path/to/key.json` or leave empty                             |
| **Scheduled Jobs**               |                                    |                                                                |
| `BILL_GENERATION_SCHEDULE`       | Cron expression for monthly bills  | `0 0 1 * *` (1st day of month at midnight)                     |
| `USE_LOCAL_CRON`                 | Use node-cron (local only)         | `true` (dev), `false` (production)                             |
| `CRON_SECRET_KEY`                | Secret key for cron endpoint       | _Required for production Cloud Scheduler_                      |
| **App Configuration**            |                                    |                                                                |
| `KAS_KELAS_AMOUNT`               | Monthly class dues amount (IDR)    | `10000`                                                        |
| `CORS_ORIGIN`                    | Allowed CORS origins (comma-sep)   | `http://localhost:5173,https://your-frontend.com`              |

⚠️ **Important**: Generate secure JWT secrets for production:

```bash
openssl rand -base64 64
```

---

## 📖 API Documentation

### Interactive API Docs

Swagger UI is available at: **http://localhost:3000/api/docs**

### Seeded Test Accounts

**Bendahara (Treasurer):**

```
NIM: 1313624000
Password: 12345678
Role: bendahara
```

**Students (Class A):**

```
NIMs: 1313624001 - 1313624068 (40 students)
Password: 12345678
Role: user
```

**Students (Class B):**

```
NIMs: 1313624011 - 1313624085 (43 students)
Password: 12345678
Role: user
```

---

## 💻 Development

### Available Scripts

| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `bun dev`              | Start development server with hot reload |
| `bun run build`        | Build for production                     |
| `bun run build:binary` | Build standalone binary with Bun         |
| `bun start`            | Start production server                  |
| `bun start:prod`       | Deploy migrations and start server       |
| `bun lint`             | Run ESLint                               |
| `bun lint:fix`         | Fix ESLint issues                        |
| `bun run format`       | Format code with Prettier                |
| `bun run type-check`   | Run TypeScript type checking             |
| `bun run commit`       | Interactive commit with Commitizen       |
| **Database**           |                                          |
| `bun prisma:generate`  | Generate Prisma Client to src/prisma/    |
| `bun prisma:migrate`   | Run database migrations (dev)            |
| `bun prisma:deploy`    | Deploy migrations (production)           |
| `bun prisma:studio`    | Open Prisma Studio (interactive DB GUI)  |
| `bun seed`             | Seed database with initial data          |
| `bun seed:past-bills`  | Seed historical cash bills               |
| `bun seed:expenses`    | Seed expense transactions                |
| `bun run clean:data`   | ⚠️ Clean all data from database          |
| **Testing**            |                                          |
| `bun test`             | Run tests with Bun                       |
| `bun test:watch`       | Run tests in watch mode                  |
| `bun test:up`          | Start test database services             |
| `bun test:down`        | Stop test database services              |
| `bun test:migrate`     | Run migrations on test database          |

### Database Management

**View database with Prisma Studio:**

```bash
bun prisma:studio
```

**Create new migration:**

```bash
bun prisma migrate dev --name your_migration_name
```

**Reset database (⚠️ destroys all data):**

```bash
bun prisma migrate reset
```

## 🏗️ Architecture & Design

### Prisma v7 Setup

The project uses **Prisma v7** with modern best practices:

- **Provider**: `prisma-client` (not `prisma-client-js`)
- **Custom Output Path**: Generated client lives in `src/prisma/generated/`
- **Adapter**: Uses `@prisma/adapter-pg` with direct PostgreSQL connection
- **Accelerate**: Uses `@prisma/extension-accelerate` for production (Prisma Accelerate)
- **Seeding**: Automatic seeding via `seed: "bun prisma/seed.ts"` in migrations config

### Runtime: Bun

This project uses **Bun** as the JavaScript runtime:

- **Fast Execution**: Significantly faster than Node.js
- **Built-in TypeScript**: No need for ts-node or tsx
- **Hot Reload**: Fast development with `bun --watch`
- **Binary Compilation**: Create standalone executables with `bun build --compile`
- **Node.js Compatible**: Works with existing Node.js packages

### Layered Architecture

The codebase follows a clean layered architecture:

1. **Routes** (`src/routes/`) - API endpoint definitions
2. **Controllers** (`src/controllers/`) - Request/response handling
3. **Services** (`src/services/`) - Business logic
4. **Repositories** (`src/repositories/`) - Data access
5. **Middlewares** (`src/middlewares/`) - Request processing (auth, validation, etc.)
6. **Validators** (`src/validators/`) - Joi schemas for input validation

### Cache Invalidation Strategy

Redis is used as a **Cache-Aside** layer. Every write path invalidates its own derived views immediately after the database commit:

| Mutation                       | Evicted cache keys                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `confirmPayment`               | `bendahara-dashboard*`, `bendahara-bills*`, `rekap-kas*`, `transactions:all*`, `balance:all`, `chart-data*`, `breakdown*` |
| `approveFundApplication`       | Same as above                                                                                                             |
| `createManualTransaction`      | Same as above                                                                                                             |
| `invalidateTransactionCache()` | `transactions:all*`, `balance:all`, `chart-data*`, `breakdown*`, `bendahara-dashboard*`, `rekap-kas*`                     |

**Key design decision**: patterns are broad (`rekap-kas*`, not `rekap-kas:all*`) so class-specific entries don't survive a global mutation and serve stale data.

### ACID Transactions (Prisma Interactive Transactions)

Every multi-step financial mutation is wrapped in `prisma.$transaction(async (tx) => { ... })` to guarantee atomicity:

- **`approveFundApplication`** — atomically updates fund application status **and** creates an expense transaction record. If the transaction creation fails, the status change rolls back.
- **`confirmPayment`** — atomically updates bill status with an optimistic lock (`updateMany` WHERE `status = 'menunggu_konfirmasi'`) **and** creates an income transaction. The `count === 0` guard detects a concurrent confirmation and aborts.
- **`payBillsBatch`** — wraps the entire batch payment in a single transaction so a partial failure leaves no bills half-updated.

```typescript
// Pattern used throughout bendahara.service.ts
await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
  await tx.fundApplication.update({ where: { id }, data: { status: 'approved' } });
  await tx.transaction.create({ data: { type: 'expense', amount: application.amount, ... } });
  // If either fails → full rollback
});
```

### Idempotent Cron Jobs

GCP Cloud Scheduler uses **at-least-once delivery** — a transient network error can cause the same trigger to fire twice. Bill generation is protected by a Redis distributed lock:

```
lock:bill-generation:2026-06  →  TTL 1 hour
```

- **On first call**: `SET NX EX 3600` acquires the lock and generation proceeds.
- **On duplicate delivery within 1 hour**: lock exists → `generateMonthlyBills()` returns `{ skipped: true }` → endpoint responds `423 Locked`.
- **After 1 hour**: lock expires. If Cloud Scheduler retries legitimately (e.g. manual re-trigger), the per-user duplicate check (`cashBill.findMany WHERE userId IN [...] AND month AND year`) is the second line of defence and prevents any duplicate bill records.
- **Redis unavailable**: `safeRedisSetNX` fails open (returns `true`), so generation always proceeds when Redis is down.

### File Upload Security (Magic-Byte Validation)

`file.mimetype` and `file.originalname` are both strings from the HTTP request — the client sets them. An attacker can rename `shell.php` to `bukti.png`, set `Content-Type: image/jpeg`, and bypass any check that only reads those fields.

The fix in [`upload.middleware.ts`](src/middlewares/upload.middleware.ts) reads the actual bytes at the start of `file.buffer` (available because `multer.memoryStorage()` buffers the whole file before the middleware runs) and matches them against known binary signatures:

| MIME type                  | Signature                                       | Offset  |
| -------------------------- | ----------------------------------------------- | ------- |
| `image/jpeg` / `image/jpg` | `FF D8 FF`                                      | 0       |
| `image/png`                | `89 50 4E 47 0D 0A 1A 0A`                       | 0       |
| `image/webp`               | `52 49 46 46` (RIFF) **+** `57 45 42 50` (WEBP) | 0 and 8 |
| `application/pdf`          | `25 50 44 46` (%PDF)                            | 0       |

WebP requires two probes because bytes 4–7 are the variable file size; the magic is split across offsets 0 and 8.

Validation order in `validateFile()`:

1. File size (fail fast on obvious oversize)
2. Declared MIME type against allowlist (fail fast on obviously wrong content-type)
3. File extension against allowlist (fail fast on obviously wrong name)
4. **Magic-byte check** — the only authoritative gate; a mismatch here rejects the file regardless of what the headers say

The error returned to the client (`"File content does not match the declared file type"`) is intentionally generic to avoid revealing implementation details to an attacker.

### Authentication Flow

1. User logs in with NIM + Password
2. Server validates credentials and hashes password with bcrypt
3. JWT tokens generated:
   - Access token (1 hour expiry)
   - Refresh token (7 days expiry)
4. Tokens stored in secure HTTP-only cookies or headers

### Role-Based Access Control

- **user**: Regular student - can view own transactions and apply for funds
- **bendahara**: Treasurer - can manage all finances and approve applications

### Request Validation

All endpoints use Joi schema validation via `validator.middleware.ts`:

- Validates request body, params, and query
- Returns 400 Bad Request with error details on validation failure
- Supports both application/json and application/x-www-form-urlencoded

---

## 🚀 Deployment

### Local Docker Build

Build the production image:

```bash
docker build -t galacash-server .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="your_production_db_url" \
  -e JWT_SECRET="your_jwt_secret" \
  -e JWT_REFRESH_SECRET="your_refresh_secret" \
  galacash-server
```

### Google Cloud Platform

The project includes Cloud Build configuration for automated deployment:

#### Using Cloud Build

The `cloudbuild.yaml` file automates the deployment process:

1. Installs dependencies
2. Generates Prisma client
3. Builds a standalone binary with Bun
4. Creates a Docker image
5. Pushes to Artifact Registry
6. Deploys to Cloud Run

To deploy:

```bash
gcloud builds submit --config cloudbuild.yaml
```

#### Manual Cloud Run Deployment

1. **Build and push image:**

```bash
# Authenticate
gcloud auth configure-docker asia-southeast2-docker.pkg.dev

# Build image
docker build -t asia-southeast2-docker.pkg.dev/YOUR_PROJECT_ID/galacash-server/galacash-server .

# Push to Artifact Registry
docker push asia-southeast2-docker.pkg.dev/YOUR_PROJECT_ID/galacash-server/galacash-server
```

2. **Deploy to Cloud Run:**

```bash
gcloud run deploy galacash-server \
  --image asia-southeast2-docker.pkg.dev/YOUR_PROJECT_ID/galacash-server/galacash-server \
  --platform managed \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,USE_LOCAL_CRON=false" \
  --set-env-vars "PRISMA_CLIENT_ENGINE_TYPE=dataproxy"
```

3. **Configure secrets:**

Use Cloud Run Secret Manager for sensitive variables:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `PRISMA_DATABASE_URL` (Prisma Accelerate URL)
- `REDIS_URL` (Upstash or Cloud Redis)
- `CRON_SECRET_KEY`
- `GCP_PROJECT_ID` and `GCP_BUCKET_NAME` (for file uploads)

4. **Set up Cloud Scheduler:**

Create a cron job to trigger bill generation:

```bash
gcloud scheduler jobs create http generate-monthly-bills \
  --location=asia-southeast2 \
  --schedule="0 0 1 * *" \
  --uri="https://your-cloud-run-url/api/cron/generate-bills" \
  --http-method=POST \
  --headers="X-Cron-Secret=YOUR_CRON_SECRET_KEY"
```

---

## 🔧 Troubleshooting

### Docker containers won't start

```bash
# Check Docker Desktop is running
docker --version

# View container logs
docker-compose logs postgres
docker-compose logs redis

# Restart containers
docker-compose restart
```

### Database connection errors

```bash
# Verify PostgreSQL is running on port 5433
docker-compose ps

# Test connection (note: port 5433, not 5432)
docker exec -it galacash-postgres psql -U galacash -d galacash_db

# Reset database
bun prisma migrate reset
```

### Port conflicts

The Docker setup uses:

- PostgreSQL on **port 5433** (to avoid default 5432 conflicts)
- Redis on **port 6379**
- Express on **port 3000**

To use different ports, edit `docker-compose.yml` and update `.env`.

---

## 📚 Additional Resources

- [OpenAPI Schema](./openapi.yaml)
- [Prisma Schema](./prisma/schema.prisma)
- [Prisma v7 Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## ✨ Project Highlights

- **⚡ Fast Runtime**: Uses Bun for blazing-fast performance
- **🔒 Type-Safe**: Full TypeScript with strict mode enabled
- **📚 Well-Documented**: Swagger UI, OpenAPI spec, and comprehensive README
- **🏗️ Modern Stack**: Bun, Express 5.x, Prisma v7, PostgreSQL 16
- **🛡️ Production-Ready**: Docker support, error handling, structured logging, rate limiting
- **👨‍💻 Developer-Friendly**: Hot reload, Prisma Studio, formatted code, Git hooks
- **🧪 Testing**: Bun test runner with test database setup
- **📦 Binary Compilation**: Can be built as a standalone executable
- **☁️ Cloud-Native**: Configured for Google Cloud Run deployment
- **♻️ Clean Architecture**: Layered design with clear separation of concerns
- **💾 Smart Caching**: Cache-Aside pattern with full invalidation — no stale aggregates after any financial mutation
- **🔐 ACID Guarantees**: Prisma Interactive Transactions on every multi-step financial operation
- **🔁 Idempotent Jobs**: Redis distributed lock on bill generation prevents duplicate runs under GCP at-least-once delivery
- **🧱 Magic-Byte File Validation**: Upload security reads actual file binary signatures — MIME type and filename extension alone are not trusted

---

## 👥 Contributing

We follow **Conventional Commits** and ensure code quality via Husky hooks.

### Development Workflow

1. **Fork and clone** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes** and test thoroughly
4. **Commit using Commitizen**:
   ```bash
   bun run commit
   ```
   This ensures your commit messages follow the standard: `<type>(<scope>): <subject>`.
5. **Push and create a Pull Request**

### Pre-commit Checks

Before committing, the following checks run automatically:

1.  **Lint-staged**: Runs `eslint` and `prettier` on staged files.
2.  **Type-check**: Runs `tsc --noEmit` to ensure type safety.

Please see our [Contributing Guide](./CONTRIBUTING.md) for more details.

---

## 📝 License

ISC License - see [LICENSE](./LICENSE)

---

## 🎉 Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs in `logs/error.log`
3. Verify environment variables in `.env`
4. Ensure Docker containers are running
5. Check API documentation at `/api/docs`

Happy coding! 🚀
