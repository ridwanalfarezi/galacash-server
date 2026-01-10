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

| Technology            | Purpose             |
| --------------------- | ------------------- |
| **Node.js 20**        | Runtime environment |
| **Express.js**        | Web framework       |
| **TypeScript**        | Type safety         |
| **PostgreSQL**        | Primary database    |
| **Prisma**            | ORM and migrations  |
| **Redis**             | Caching layer       |
| **JWT**               | Authentication      |
| **bcrypt**            | Password hashing    |
| **GCP Cloud Storage** | File uploads        |
| **Winston**           | Logging             |
| **Joi**               | Input validation    |
| **node-cron**         | Scheduled jobs      |
| **Swagger UI**        | API documentation   |
| **Docker**            | Containerization    |

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

# Seed database with test data
pnpm seed
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
│   ├── repositories/        # Data access layer
│   ├── services/            # Business logic layer
│   ├── controllers/         # HTTP handlers
│   ├── routes/              # Route definitions
│   ├── middlewares/         # Express middlewares
│   ├── validators/          # Input validation schemas
│   ├── utils/               # Utilities and helpers
│   │   ├── errors/          # Error handling
│   │   ├── logger.ts
│   │   └── generate-tokens.ts
│   ├── jobs/                # Scheduled tasks
│   ├── types/               # TypeScript types
│   └── index.ts             # Main application
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Database seeding
├── docker-compose.yml       # Local development services
├── Dockerfile               # Production container
├── .env                     # Environment variables (git-ignored)
├── .env.example             # Environment template
└── package.json
```

---

## 🔐 Environment Variables

Key environment variables (see `.env.example` for complete list):

| Variable                   | Description                  | Default                                                        |
| -------------------------- | ---------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`             | PostgreSQL connection string | `postgresql://galacash:galacash123@localhost:5432/galacash_db` |
| `REDIS_URL`                | Redis connection string      | `redis://localhost:6379`                                       |
| `JWT_SECRET`               | JWT access token secret      | _Change in production_                                         |
| `JWT_REFRESH_SECRET`       | JWT refresh token secret     | _Change in production_                                         |
| `GCP_PROJECT_ID`           | Google Cloud project ID      | _(Optional)_                                                   |
| `GCP_BUCKET_NAME`          | GCS bucket name              | `galacash-bucket`                                              |
| `BILL_GENERATION_SCHEDULE` | Cron for monthly bills       | `0 0 1 * *`                                                    |
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
| `pnpm lint`            | Run ESLint                               |
| `pnpm lint:fix`        | Fix ESLint issues                        |
| `pnpm format`          | Format code with Prettier                |
| `pnpm prisma:generate` | Generate Prisma Client                   |
| `pnpm prisma:migrate`  | Run database migrations                  |
| `pnpm prisma:studio`   | Open Prisma Studio (DB GUI)              |
| `pnpm seed`            | Seed database with test data             |

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

### Debugging

Logs are stored in the `logs/` directory:

- `logs/combined.log` - All logs
- `logs/error.log` - Errors only

---

## 🐳 Deployment

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
# Verify PostgreSQL is running
docker-compose ps

# Test connection
docker exec -it galacash-postgres psql -U galacash -d galacash_db

# Reset database
pnpm prisma migrate reset
```

### Redis connection errors

The app will work without Redis, but caching will be disabled. Check logs for warnings.

### GCP file upload errors

File uploads are optional. If GCP credentials are not configured:

- App will log a warning on startup
- File upload endpoints will return an error
- To enable: Set `GCP_PROJECT_ID` and `GOOGLE_APPLICATION_CREDENTIALS` in `.env`

### Port already in use

```bash
# Change PORT in .env file
PORT=3001

# Or kill process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -i :3000
kill -9 <PID>
```

### Prisma Client errors

```bash
# Regenerate Prisma Client
pnpm prisma:generate

# If schema changed, create migration
pnpm prisma migrate dev --name fix_schema
```

---

## 📚 Additional Resources

- [API Specification](./BACKEND_API_SPECIFICATION.md)
- [Technical Requirements](./TECHNICAL_REQUIREMENTS.md)
- [OpenAPI Schema](./openapi.yaml)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/)

---

## 👥 Team

- **Role**: Backend Developer
- **Tech Stack**: Node.js + TypeScript + PostgreSQL

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
