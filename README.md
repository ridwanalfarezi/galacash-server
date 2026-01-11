# GalaCash Server

> **Financial management API for class treasurers**  
> Built with Node.js, Express, TypeScript, PostgreSQL, Redis, and GCP Cloud Storage

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

### Key Features

✅ **Authentication**: NIM + Password with JWT tokens  
✅ **Fund Applications (Aju Dana)**: Submit and review funding requests  
✅ **Cash Bills (Tagihan Kas)**: Automated monthly bill generation  
✅ **Transactions**: Track income and expenses  
✅ **Financial Reports (Rekap Kas)**: Comprehensive financial summaries  
✅ **File Uploads**: GCP Cloud Storage integration for payment proofs  
✅ **Caching**: Redis for improved performance  
✅ **Auto-transactions**: Bills and approvals auto-create transactions

---

## 🛠️ Tech Stack

| Technology             | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| **Node.js 20**         | Runtime environment                              |
| **Express.js**         | Web framework                                    |
| **TypeScript**         | Type safety                                      |
| **PostgreSQL**         | Primary database                                 |
| **Prisma v7**          | ORM and migrations (with prisma-client provider) |
| **@prisma/adapter-pg** | PostgreSQL adapter for Prisma                    |
| **Redis**              | Caching layer                                    |
| **JWT**                | Authentication (HS256)                           |
| **bcrypt**             | Password hashing                                 |
| **GCP Cloud Storage**  | File uploads                                     |
| **Winston**            | Logging                                          |
| **Joi**                | Input validation                                 |
| **node-cron**          | Scheduled jobs                                   |
| **Swagger UI**         | API documentation                                |
| **Docker**             | Containerization                                 |

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v20 or higher ([Download](https://nodejs.org/))
- **pnpm** v10 or higher ([Install](https://pnpm.io/installation))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com/))

Optional:

- **GCP Account** (for file uploads - can be configured later)

---

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd galacash-server
```

### 2. Install dependencies

```bash
pnpm install
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
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Seed database with test data (automatic via migrations)
pnpm prisma:migrate
```

This will create:

- 2 classes (A and B)
- 80 students (40 per class)
- 1 bendahara (treasurer): Ridwan Alfarezi
- Default password for all users: `password123`

### 6. Start development server

```bash
pnpm dev
```

The server will start on `http://localhost:3000`

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
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic layer
│   ├── repositories/        # Data access layer
│   ├── middlewares/         # Express middlewares
│   │   ├── auth.middleware.ts
│   │   ├── upload.middleware.ts
│   │   ├── validator.middleware.ts
│   │   └── index.ts
│   ├── validators/          # Input validation schemas
│   ├── utils/               # Utilities and helpers
│   │   ├── errors/          # Error handling & codes
│   │   ├── logger.ts        # Winston logger
│   │   ├── generate-tokens.ts # JWT token generation
│   │   └── prisma-client.ts # Prisma singleton with adapter
│   ├── types/               # TypeScript type definitions
│   │   ├── express.d.ts
│   │   └── index.ts
│   ├── jobs/                # Scheduled tasks
│   │   └── bill-generator.job.ts
│   └── index.ts             # Application entry point
├── src/generated/prisma/    # Auto-generated Prisma Client
│   ├── client.ts
│   ├── browser.ts
│   ├── enums.ts
│   ├── commonInputTypes.ts
│   ├── models/
│   └── internal/
├── prisma/
│   ├── schema.prisma        # Database schema (Prisma v7 format)
│   ├── seed.ts              # Database seeding
│   ├── migrations/          # Database migrations
│   │   └── migration_lock.toml
│   └── config.ts            # Prisma v7 configuration
├── scripts/
│   ├── endpoint_smoke.py     # Comprehensive smoke test suite
│   ├── run-smoke-test.sh     # Linux/Mac test runner
│   ├── run-smoke-test.bat    # Windows test runner
│   ├── README.md             # Smoke test documentation
│   ├── EXAMPLES.md           # Usage examples and scenarios
│   └── requirements.txt      # Python dependencies (empty - no deps needed)
├── docker-compose.yml       # Local development services
├── Dockerfile               # Production container
├── prisma.config.ts         # Prisma v7 configuration (datasource, migrations, seed)
├── tsconfig.json
├── .env                     # Environment variables (git-ignored)
├── .env.example             # Environment template
├── eslint.config.js         # ESLint flat config
├── pnpm-workspace.yaml
├── package.json
├── BACKEND_API_SPECIFICATION.md
├── TECHNICAL_REQUIREMENTS.md
├── openapi.yaml
└── README.md
```

---

## 🔐 Environment Variables

Key environment variables (see `.env.example` for complete list):

| Variable                   | Description                  | Default                                                        |
| -------------------------- | ---------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`             | PostgreSQL connection string | `postgresql://galacash:galacash123@localhost:5433/galacash_db` |
| `REDIS_URL`                | Redis connection string      | `redis://localhost:6379`                                       |
| `JWT_SECRET`               | JWT access token secret      | _Change in production_                                         |
| `JWT_REFRESH_SECRET`       | JWT refresh token secret     | _Change in production_                                         |
| `GCP_PROJECT_ID`           | Google Cloud project ID      | _(Optional)_                                                   |
| `GCP_BUCKET_NAME`          | GCS bucket name              | `galacash-bucket`                                              |
| `BILL_GENERATION_SCHEDULE` | Cron for monthly bills       | `0 0 1 * *` (1st of each month at midnight)                    |
| `PORT`                     | Server port                  | `3000`                                                         |
| `NODE_ENV`                 | Environment                  | `development`                                                  |

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
NIM: 1313699999
Password: password123
Role: bendahara
```

**Students (Class A):**

```
NIMs: 1313600001 - 1313600040
Password: password123
Role: user
```

**Students (Class B):**

```
NIMs: 1313600041 - 1313600080
Password: password123
Role: user
```

### Quick API Examples

**Login:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nim":"1313699999","password":"password123"}'
```

**Get Dashboard (requires token):**

```bash
curl -X GET http://localhost:3000/api/dashboard/summary \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 💻 Development

### Available Scripts

| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `pnpm dev`             | Start development server with hot reload |
| `pnpm build`           | Build for production                     |
| `pnpm start`           | Start production server                  |
| `pnpm lint`            | Run ESLint (flat config)                 |
| `pnpm lint:fix`        | Fix ESLint issues                        |
| `pnpm format`          | Format code with Prettier                |
| `pnpm prisma:generate` | Generate Prisma Client to src/generated/ |
| `pnpm prisma:migrate`  | Run database migrations                  |
| `pnpm prisma:studio`   | Open Prisma Studio (interactive DB GUI)  |
| `pnpm test:smoke`      | Run comprehensive smoke tests            |

### Testing

**Run comprehensive smoke tests:**

```bash
# Quick run with summary
pnpm test:smoke

# Or run directly with Python
python scripts/endpoint_smoke.py

# With verbose output
VERBOSE=1 python scripts/endpoint_smoke.py

# Save export files
SAVE_DIR=./tmp/exports python scripts/endpoint_smoke.py

# Windows PowerShell
$env:VERBOSE="1"; python scripts/endpoint_smoke.py
```

**What the smoke tests cover:**

- ✅ 127+ endpoint tests across all features
- ✅ Authentication flows (login, refresh, logout)
- ✅ User dashboard and transactions
- ✅ Fund applications with all filters
- ✅ Cash bills management
- ✅ Bendahara operations
- ✅ Export functionality (Excel/CSV)
- ✅ Pagination, sorting, and date ranges
- ✅ Labels and payment accounts

See [`scripts/README.md`](scripts/README.md) for detailed documentation and [`scripts/EXAMPLES.md`](scripts/EXAMPLES.md) for usage examples.

### Database Management

**View database with Prisma Studio:**

```bash
pnpm prisma:studio
```

**Create new migration:**

```bash
pnpm prisma migrate dev --name your_migration_name
```

**Reset database (⚠️ destroys all data):**

```bash
pnpm prisma migrate reset
```

### Testing

**Run endpoint smoke test:**

```bash
python scripts/endpoint_smoke.py
```

Tests all major endpoints using stdlib (no external dependencies):

- Authentication (login, token refresh)
- Dashboard endpoints
- Transaction management
- Fund applications
- Cash bills
- Bendahara administrative endpoints

### Debugging

Logs are stored in the `logs/` directory:

- `logs/combined.log` - All logs
- `logs/error.log` - Errors only

## 🏗️ Architecture & Design

### Prisma v7 Setup

The project uses **Prisma v7** with modern best practices:

- **Provider**: `prisma-client` (not `prisma-client-js`)
- **Custom Output Path**: Generated client lives in `src/generated/prisma/`
- **Configuration**: Database URL and seed config in `prisma.config.ts` (not schema.prisma)
- **Adapter**: Uses `@prisma/adapter-pg` for direct PostgreSQL connection
- **Seeding**: Automatic seeding via `seed: "tsx prisma/seed.ts"` in migrations config

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

### Docker Build

Build the production image:

```bash
docker build -t galacash-server .
```

Run the container:

```bash
docker run -p 8080:8080 \
  -e DATABASE_URL="your_production_db_url" \
  -e JWT_SECRET="your_jwt_secret" \
  galacash-server
```

### Google Cloud Run

1. **Build and push image:**

```bash
# Authenticate
gcloud auth configure-docker

# Build image
docker build -t gcr.io/YOUR_PROJECT_ID/galacash-server .

# Push to Container Registry
docker push gcr.io/YOUR_PROJECT_ID/galacash-server
```

2. **Deploy to Cloud Run:**

```bash
gcloud run deploy galacash-server \
  --image gcr.io/YOUR_PROJECT_ID/galacash-server \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "DATABASE_URL=your_cloud_sql_url" \
  --add-cloudsql-instances your_cloud_sql_instance
```

3. **Set secrets:**

Use Cloud Run Secret Manager for sensitive variables:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DATABASE_URL`

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
pnpm prisma migrate reset
```

### Port conflicts

The Docker setup uses:

- PostgreSQL on **port 5433** (to avoid default 5432 conflicts)
- Redis on **port 6379**
- Express on **port 3000**

To use different ports, edit `docker-compose.yml` and update `.env`.

---

## 📚 Additional Resources

- [API Specification](./BACKEND_API_SPECIFICATION.md)
- [Technical Requirements](./TECHNICAL_REQUIREMENTS.md)
- [OpenAPI Schema](./openapi.yaml)
- [Prisma v7 Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## 🤖 Testing

### Smoke Test

The project includes a comprehensive endpoint smoke test using Python (stdlib only):

```bash
python scripts/endpoint_smoke.py
```

This test:

- Logs in as both student and bendahara
- Tests all major endpoint groups
- Validates response status codes
- Measures response times
- Handles conflicts gracefully
- Requires no external Python dependencies

**Expected Output**: ✅ All tests passed

---

## ✨ Project Highlights

- **Type-Safe**: Full TypeScript with strict mode
- **Tested**: Comprehensive endpoint smoke test included
- **Documented**: Swagger UI, OpenAPI spec, and detailed README
- **Modern Stack**: Express 5.x, Prisma v7, PostgreSQL 16
- **Production-Ready**: Docker support, proper error handling, structured logging
- **Developer-Friendly**: Hot reload, Prisma Studio, formatted code

---

## 👥 Team

- **Role**: Backend Developer
- **Tech Stack**: Node.js + TypeScript + PostgreSQL + Prisma v7
- **Repository**: https://github.com/ridwanalfarezi/galacash-server (private)

---

## 📝 License

ISC

---

## 🎉 Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs in `logs/error.log`
3. Verify environment variables in `.env`
4. Ensure Docker containers are running
5. Check API documentation at `/api/docs`

Happy coding! 🚀
