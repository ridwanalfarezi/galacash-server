# GalaCash Backend - Technical Requirements & Implementation Guide

> **Version:** 1.0.0  
> **Last Updated:** January 11, 2026  
> **Target Team:** Mid-level Backend Developer (1 person)  
> **Deployment:** Google Cloud Run

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Naming Conventions](#naming-conventions)
6. [Database Schema](#database-schema)
7. [Authentication & Security](#authentication--security)
8. [Error Handling](#error-handling)
9. [Caching Strategy](#caching-strategy)
10. [File Upload](#file-upload)
11. [API Implementation Patterns](#api-implementation-patterns)
12. [Code Templates](#code-templates)
13. [Scheduled Jobs](#scheduled-jobs)
14. [Deployment](#deployment)
15. [Environment Variables](#environment-variables)

---

## 🎯 Overview

### Project Description

GalaCash is a financial management application for class treasurers (bendahara) and students (siswa). The backend provides:

- **Authentication**: NIM + Password based system
- **Roles**: `user` (student) and `bendahara` (treasurer)
- **Core Features**:
  - Transaction tracking (income/expense)
  - Fund applications (Aju Dana)
  - Cash bill management (Tagihan Kas)
  - Financial reporting (Rekap Kas)

### Key Principles

✅ **Clean Architecture** - Repository + Service + MVC pattern  
✅ **Type Safety** - Full TypeScript implementation  
✅ **Separation of Concerns** - Each layer has single responsibility  
✅ **Error Handling** - Centralized, structured responses  
✅ **Security First** - Password hashing, JWT tokens, input validation  
✅ **Scalability** - Redis caching, efficient database queries

---

## 🏗️ Architecture

### Layered Architecture Pattern

```
┌─────────────────────────────────────────────┐
│          EXPRESS APP (index.ts)             │
│  • Middleware setup                         │
│  • Route registration                       │
│  • Global error handler                     │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│         ROUTES (auth.routes.ts)             │
│  • Route definitions                        │
│  • Middleware attachment                    │
│  • Validation triggers                      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│      CONTROLLERS (auth.controller.ts)       │
│  • Extract request data                     │
│  • Call services                            │
│  • Return HTTP responses                    │
│  • NO business logic                        │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│        SERVICES (auth.service.ts)           │
│  • Business logic                           │
│  • Input validation                         │
│  • Authorization checks                     │
│  • Orchestrate repositories                 │
│  • Manage caching                           │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│     REPOSITORIES (user.repository.ts)       │
│  • Database operations only                 │
│  • Prisma queries                           │
│  • Error conversion (Prisma → AppError)     │
│  • NO business logic                        │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│          PRISMA ORM + POSTGRESQL            │
└─────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer            | Purpose        | What It DOES                                  | What It DOESN'T Do                        |
| ---------------- | -------------- | --------------------------------------------- | ----------------------------------------- |
| **Controllers**  | HTTP handling  | Extract data, call services, return responses | ❌ Business logic, DB queries, validation |
| **Services**     | Business logic | Validate, authorize, orchestrate, cache       | ❌ HTTP concerns, direct DB access        |
| **Repositories** | Data access    | Query DB, handle errors, return data          | ❌ Business logic, caching, validation    |

---

## 🛠️ Tech Stack

### Core Dependencies

```json
{
  "dependencies": {
    "express": "latest",
    "typescript": "latest",
    "@prisma/client": "latest",
    "bcrypt": "latest",
    "jsonwebtoken": "latest",
    "redis": "latest",
    "winston": "latest",
    "@google-cloud/storage": "latest",
    "multer": "latest",
    "node-cron": "latest",
    "helmet": "latest",
    "cors": "latest",
    "express-rate-limit": "latest",
    "cookie-parser": "latest",
    "dotenv": "latest"
  },
  "devDependencies": {
    "@types/express": "latest",
    "@types/bcrypt": "latest",
    "@types/jsonwebtoken": "latest",
    "@types/multer": "latest",
    "@types/node": "latest",
    "@types/node-cron": "latest",
    "prisma": "latest",
    "nodemon": "latest",
    "ts-node": "latest"
  }
}
```

### Why These Tools?

| Tool            | Purpose          | Why                                     |
| --------------- | ---------------- | --------------------------------------- |
| **Prisma**      | ORM              | Type-safe queries, migrations, great DX |
| **bcrypt**      | Password hashing | Industry standard (10 rounds)           |
| **JWT**         | Auth tokens      | Stateless, widely supported             |
| **Redis**       | Caching          | Fast, supports Cloud Run                |
| **Winston**     | Logging          | Structured logs, multiple transports    |
| **GCP Storage** | File uploads     | Serverless, scalable, cost-effective    |
| **Helmet**      | Security         | HTTP header protection                  |
| **node-cron**   | Scheduling       | Simple, reliable for bill generation    |

---

## 📁 Project Structure

```
galacash-server/
├── src/
│   ├── config/                    # Configuration files
│   │   ├── redis.config.ts
│   │   ├── storage.config.ts      # GCP Storage
│   │   └── multer.config.ts
│   │
│   ├── repositories/              # Data Access Layer
│   │   ├── user.repository.ts
│   │   ├── transaction.repository.ts
│   │   ├── fund-application.repository.ts
│   │   ├── cash-bill.repository.ts
│   │   ├── refresh-token.repository.ts
│   │   └── index.ts               # Barrel exports
│   │
│   ├── services/                  # Business Logic Layer
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── transaction.service.ts
│   │   ├── fund-application.service.ts
│   │   ├── cash-bill.service.ts
│   │   ├── bendahara.service.ts
│   │   ├── cache.service.ts
│   │   └── index.ts
│   │
│   ├── controllers/               # HTTP Layer
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── transaction.controller.ts
│   │   ├── fund-application.controller.ts
│   │   ├── cash-bill.controller.ts
│   │   ├── bendahara.controller.ts
│   │   └── index.ts
│   │
│   ├── routes/                    # Route Definitions
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── transaction.routes.ts
│   │   ├── fund-application.routes.ts
│   │   ├── cash-bill.routes.ts
│   │   ├── bendahara.routes.ts
│   │   └── index.ts
│   │
│   ├── middlewares/               # Express Middlewares
│   │   ├── auth.middleware.ts     # JWT verification
│   │   ├── validator.middleware.ts
│   │   └── upload.middleware.ts   # Multer + GCP
│   │
│   ├── validators/                # Input Validation
│   │   └── schemas.ts             # All validation schemas
│   │
│   ├── utils/                     # Utilities
│   │   ├── errors/
│   │   │   ├── app-error.ts       # Custom error classes
│   │   │   ├── error-handler.ts   # Global handler
│   │   │   ├── error-codes.ts
│   │   │   └── index.ts
│   │   ├── logger.ts
│   │   ├── generate-tokens.ts
│   │   ├── verify-refresh-token.ts
│   │   ├── prisma-client.ts
│   │   └── async-handler.ts
│   │
│   ├── jobs/                      # Scheduled Tasks
│   │   └── bill-generator.job.ts
│   │
│   ├── container/                 # Dependency Injection
│   │   └── di-container.ts
│   │
│   ├── types/                     # TypeScript Types
│   │   ├── express.d.ts           # Extend Express types
│   │   └── index.ts
│   │
│   ├── env.ts                     # Environment validation
│   └── index.ts                   # Main application
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                    # Import users/classes
│
├── .env.example
├── .dockerignore
├── Dockerfile
├── docker-compose.yml             # Local dev (PostgreSQL + Redis)
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📝 Naming Conventions

### File Naming

✅ **Use kebab-case for files**  
✅ **Include layer suffix**  
✅ **Singular for entity names**

```typescript
// ✅ CORRECT
user.repository.ts;
auth.service.ts;
transaction.controller.ts;
fund - application.routes.ts;
cash - bill.service.ts;

// ❌ WRONG
UserRepository.ts; // Don't use PascalCase
auth_service.ts; // Don't use snake_case
transactions.controller.ts; // Don't use plural (except in routes)
fundApplication.service.ts; // Don't use camelCase
```

### Class/Interface Naming

✅ **PascalCase**  
✅ **Descriptive suffixes**

```typescript
// Classes
export class UserRepository {}
export class AuthService {}
export class TransactionController {}

// Interfaces
export interface CreateUserInput {}
export interface LoginRequest {}
export interface PaginationParams {}
```

### Variable/Function Naming

✅ **camelCase**  
✅ **Descriptive names**

```typescript
// ✅ CORRECT
const accessToken = generateAccessToken(user);
async function getUserById(id: string) {}
const hasPermission = await checkUserRole(userId);

// ❌ WRONG
const token = gen(u); // Too short
async function get_user(id) {} // snake_case
const CheckPermission = await check(); // PascalCase
```

### Constants

✅ **SCREAMING_SNAKE_CASE**

```typescript
// ✅ CORRECT
const ACCESS_TOKEN_EXPIRY = "1h";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BCRYPT_ROUNDS = 10;

// ❌ WRONG
const accessTokenExpiry = "1h";
const maxFileSize = 5000000;
```

---

## 🗄️ Database Schema

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Enums
enum UserRole {
  user
  bendahara
}

enum TransactionType {
  income
  expense
}

enum FundCategory {
  education
  health
  emergency
  equipment
}

enum FundStatus {
  pending
  approved
  rejected
}

enum BillStatus {
  belum_dibayar
  menunggu_konfirmasi
  sudah_dibayar
}

enum PaymentMethod {
  bank
  ewallet
  cash
}

// Models
model Class {
  id        String   @id @default(uuid())
  name      String   @db.VarChar(100)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users            User[]
  transactions     Transaction[]
  fundApplications FundApplication[]
  cashBills        CashBill[]

  @@map("classes")
}

model User {
  id        String   @id @default(uuid())
  nim       String   @unique @db.VarChar(10)
  name      String   @db.VarChar(255)
  email     String?  @db.VarChar(255)
  password  String   @db.VarChar(255)
  role      UserRole @default(user)
  classId   String?  @map("class_id")
  avatarUrl String?  @map("avatar_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  class                Class?            @relation(fields: [classId], references: [id])
  fundApplications     FundApplication[] @relation("Applicant")
  reviewedApplications FundApplication[] @relation("Reviewer")
  cashBills            CashBill[]        @relation("BillOwner")
  confirmedBills       CashBill[]        @relation("BillConfirmer")
  createdTransactions  Transaction[]
  refreshTokens        RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String   @map("user_id")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

model Transaction {
  id                String          @id @default(uuid())
  classId           String          @map("class_id")
  type              TransactionType
  description       String          @db.VarChar(500)
  amount            Decimal         @db.Decimal(15, 2)
  date              DateTime        @default(now()) @db.Date
  fundApplicationId String?         @map("fund_application_id")
  createdById       String?         @map("created_by")
  createdAt         DateTime        @default(now()) @map("created_at")

  class           Class            @relation(fields: [classId], references: [id])
  fundApplication FundApplication? @relation(fields: [fundApplicationId], references: [id])
  createdBy       User?            @relation(fields: [createdById], references: [id])

  @@index([classId])
  @@index([date])
  @@map("transactions")
}

model FundApplication {
  id              String       @id @default(uuid())
  userId          String       @map("user_id")
  classId         String       @map("class_id")
  purpose         String       @db.VarChar(255)
  description     String?
  category        FundCategory
  amount          Decimal      @db.Decimal(15, 2)
  status          FundStatus   @default(pending)
  attachmentUrl   String?      @map("attachment_url")
  rejectionReason String?      @map("rejection_reason")
  reviewedById    String?      @map("reviewed_by")
  reviewedAt      DateTime?    @map("reviewed_at")
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  user         User          @relation("Applicant", fields: [userId], references: [id])
  class        Class         @relation(fields: [classId], references: [id])
  reviewedBy   User?         @relation("Reviewer", fields: [reviewedById], references: [id])
  transactions Transaction[]

  @@index([userId])
  @@index([status])
  @@map("fund_applications")
}

model CashBill {
  id              String         @id @default(uuid())
  userId          String         @map("user_id")
  classId         String         @map("class_id")
  billId          String         @unique @map("bill_id") @db.VarChar(50)
  month           String         @db.VarChar(20)
  year            Int
  dueDate         DateTime       @map("due_date") @db.Date
  kasKelas        Decimal        @default(30000) @map("kas_kelas") @db.Decimal(15, 2)
  biayaAdmin      Decimal        @default(1000) @map("biaya_admin") @db.Decimal(15, 2)
  totalAmount     Decimal        @map("total_amount") @db.Decimal(15, 2)
  status          BillStatus     @default(belum_dibayar)
  paymentMethod   PaymentMethod? @map("payment_method")
  paymentProofUrl String?        @map("payment_proof_url")
  paidAt          DateTime?      @map("paid_at")
  confirmedById   String?        @map("confirmed_by")
  confirmedAt     DateTime?      @map("confirmed_at")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  user        User   @relation("BillOwner", fields: [userId], references: [id])
  class       Class  @relation(fields: [classId], references: [id])
  confirmedBy User?  @relation("BillConfirmer", fields: [confirmedById], references: [id])

  @@unique([userId, month, year])
  @@index([userId])
  @@index([status])
  @@index([dueDate])
  @@map("cash_bills")
}
```

### Migration Commands

```bash
# Create migration
npx prisma migrate dev --name init

# Apply migrations in production
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (GUI)
npx prisma studio
```

---

## 🔐 Authentication & Security

### Password Security Guidelines

#### Hashing with bcrypt

**ALWAYS use bcrypt with 10 rounds** for production:

```typescript
// utils/password.ts
import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(plainPassword, hashedPassword);
}
```

#### Password Requirements

**Enforce these rules in validation:**

- Minimum 8 characters
- At least one uppercase letter (optional but recommended)
- At least one number (optional but recommended)
- No common passwords (implement blacklist if needed)

```typescript
// validators/schemas.ts
import Joi from "joi";

export const passwordSchema = Joi.string().min(8).max(128).required().messages({
  "string.min": "Password harus minimal 8 karakter",
  "string.max": "Password maksimal 128 karakter",
});

export const changePasswordSchema = Joi.object({
  oldPassword: passwordSchema,
  newPassword: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Konfirmasi password tidak sesuai",
    }),
});
```

### JWT Token Strategy

#### Token Types

1. **Access Token**: Short-lived (1 hour), contains user data
2. **Refresh Token**: Long-lived (7 days), stored in database

#### Access Token Payload

```typescript
interface AccessTokenPayload {
  sub: string; // User ID
  nim: string;
  role: "user" | "bendahara";
  classId: string;
  iat: number; // Issued at
  exp: number; // Expires at
}
```

#### Token Generation

```typescript
// utils/generate-tokens.ts
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";

export function generateAccessToken(user: {
  id: string;
  nim: string;
  role: string;
  classId: string;
}): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    nim: user.nim,
    role: user.role as "user" | "bendahara",
    classId: user.classId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(): string {
  return jwt.sign({ jti: uuidv4() }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export async function storeRefreshToken(
  userId: string,
  token: string
): Promise<void> {
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  const expiresAt = new Date(decoded.exp! * 1000);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
}
```

#### Token Verification Middleware

```typescript
// middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticationError, AuthorizationError } from "../utils/errors";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;

interface AuthRequest extends Request {
  user?: AccessTokenPayload;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("Access token is required");
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(
      token,
      ACCESS_TOKEN_SECRET
    ) as AccessTokenPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError("Invalid access token"));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError("Access token expired"));
    } else {
      next(error);
    }
  }
};

export const requireRole = (allowedRoles: Array<"user" | "bendahara">) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError("Unauthenticated"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          "You do not have permission to access this resource"
        )
      );
    }

    next();
  };
};

// Common role middlewares
export const requireBendahara = requireRole(["bendahara"]);
export const requireUser = requireRole(["user", "bendahara"]); // Both can access
```

### Security Headers with Helmet

```typescript
// index.ts
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://storage.googleapis.com"],
        scriptSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

### Rate Limiting

```typescript
// index.ts
import rateLimit from "express-rate-limit";

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  message: "Too many authentication attempts, please try again later",
  skipSuccessfulRequests: true,
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);
```

---

## ⚠️ Error Handling

### Error Class Hierarchy

```typescript
// utils/errors/app-error.ts

/**
 * Base application error
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (HTTP 400)
 */
export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 400);
    Object.setPrototypeOf(this, ValidationError.prototype);
    this.field = field;
  }
}

/**
 * Authentication error (HTTP 401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error (HTTP 403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Permission denied") {
    super(message, 403);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error (HTTP 404)
 */
export class NotFoundError extends AppError {
  public readonly resourceType?: string;
  public readonly resourceId?: string;

  constructor(message: string, resourceType?: string, resourceId?: string) {
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Conflict error (HTTP 409)
 */
export class ConflictError extends AppError {
  public readonly conflictingField?: string;

  constructor(message: string, conflictingField?: string) {
    super(message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
    this.conflictingField = conflictingField;
  }
}

/**
 * Business logic error (HTTP 400)
 */
export class BusinessLogicError extends AppError {
  constructor(message: string) {
    super(message, 400);
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }
}

/**
 * Database error (HTTP 500)
 */
export class DatabaseError extends AppError {
  public readonly originalError?: unknown;

  constructor(
    message: string = "Database operation failed",
    originalError?: unknown
  ) {
    super(message, 500);
    Object.setPrototypeOf(this, DatabaseError.prototype);
    this.originalError = originalError;
  }
}
```

### Global Error Handler

```typescript
// utils/errors/error-handler.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "./app-error";
import { logError } from "../logger";

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    field?: string;
    timestamp: string;
  };
}

export const globalErrorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logError(error, {
    url: req.originalUrl,
    method: req.method,
    userId: (req as any).user?.sub,
  });

  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let message = "Internal server error";
  let errorCode = "INTERNAL_SERVER_ERROR";
  let field: string | undefined;

  // Handle AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;

    if (error instanceof ValidationError) {
      errorCode = "VALIDATION_ERROR";
      field = error.field;
    } else if (error.constructor.name === "AuthenticationError") {
      errorCode = "AUTHENTICATION_ERROR";
    } else if (error.constructor.name === "AuthorizationError") {
      errorCode = "AUTHORIZATION_ERROR";
    } else if (error.constructor.name === "NotFoundError") {
      errorCode = "NOT_FOUND";
    } else if (error.constructor.name === "ConflictError") {
      errorCode = "CONFLICT";
    } else if (error.constructor.name === "BusinessLogicError") {
      errorCode = "BUSINESS_LOGIC_ERROR";
    } else if (error.constructor.name === "DatabaseError") {
      errorCode = "DATABASE_ERROR";
    }
  }
  // Handle Prisma errors
  else if ((error as any).code) {
    const prismaCode = (error as any).code;

    if (prismaCode === "P2025") {
      statusCode = 404;
      errorCode = "NOT_FOUND";
      message = "Resource not found";
    } else if (prismaCode === "P2002") {
      statusCode = 409;
      errorCode = "CONFLICT";
      message = `Duplicate entry`;
    } else if (prismaCode === "P2003") {
      statusCode = 400;
      errorCode = "INVALID_REFERENCE";
      message = "Invalid reference";
    } else {
      statusCode = 500;
      errorCode = "DATABASE_ERROR";
      message = "Database operation failed";
    }
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      message,
      code: errorCode,
      statusCode,
      field,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper - catches async errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

---

## 💾 Caching Strategy

### Redis Configuration

```typescript
// config/redis.config.ts
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("✅ Redis connected"));

// Connect on startup
export async function connectRedis() {
  await redisClient.connect();
}

// Safe Redis operations with fallback
export async function safeRedisGet(key: string): Promise<string | null> {
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error("Redis GET error:", error);
    return null; // Fail gracefully
  }
}

export async function safeRedisSet(
  key: string,
  value: string,
  ttl: number = 3600
): Promise<void> {
  try {
    await redisClient.setEx(key, ttl, value);
  } catch (error) {
    console.error("Redis SET error:", error);
  }
}

export async function safeRedisDel(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error("Redis DEL error:", error);
  }
}
```

### Cache Service

```typescript
// services/cache.service.ts
import {
  safeRedisGet,
  safeRedisSet,
  safeRedisDel,
} from "../config/redis.config";

const DEFAULT_TTL = 3600; // 1 hour

export class CacheService {
  // Key generators
  generateUserKey(userId: string): string {
    return `user:${userId}`;
  }

  generateTransactionKey(transactionId: string): string {
    return `transaction:${transactionId}`;
  }

  generateTransactionsListKey(classId: string, filters: string): string {
    return `transactions:${classId}:${filters}`;
  }

  generateDashboardKey(userId: string): string {
    return `dashboard:${userId}`;
  }

  // Generic get/set
  async get<T>(key: string): Promise<T | null> {
    const cached = await safeRedisGet(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set<T>(
    key: string,
    value: T,
    ttl: number = DEFAULT_TTL
  ): Promise<void> {
    await safeRedisSet(key, JSON.stringify(value), ttl);
  }

  // Invalidation patterns
  async invalidate(pattern: string): Promise<void> {
    await safeRedisDel(pattern);
  }

  async invalidateUserCaches(userId: string): Promise<void> {
    await this.invalidate(this.generateUserKey(userId));
    await this.invalidate(`dashboard:${userId}`);
  }

  async invalidateTransactionCaches(classId: string): Promise<void> {
    await this.invalidate(`transactions:${classId}:*`);
    await this.invalidate(`dashboard:*`); // Invalidate all dashboards
  }

  async invalidateFundApplicationCaches(
    userId: string,
    classId: string
  ): Promise<void> {
    await this.invalidate(`fund-applications:${userId}:*`);
    await this.invalidate(`fund-applications:${classId}:*`);
  }
}

export const cacheService = new CacheService();
```

### Caching Pattern Example

```typescript
// services/transaction.service.ts
import { cacheService } from "./cache.service";
import { transactionRepository } from "../repositories";

export class TransactionService {
  async getTransactionById(id: string): Promise<Transaction> {
    // Try cache first
    const cacheKey = cacheService.generateTransactionKey(id);
    const cached = await cacheService.get<Transaction>(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch from database
    const transaction = await transactionRepository.findById(id);

    if (!transaction) {
      throw new NotFoundError("Transaction not found", "Transaction", id);
    }

    // Store in cache
    await cacheService.set(cacheKey, transaction);

    return transaction;
  }

  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    // Business logic...
    const transaction = await transactionRepository.create(input);

    // Invalidate related caches
    await cacheService.invalidateTransactionCaches(input.classId);

    return transaction;
  }
}
```

---

## 📤 File Upload (GCP Cloud Storage)

### GCP Storage Configuration

```typescript
// config/storage.config.ts
import { Storage } from "@google-cloud/storage";

const BUCKET_NAME = process.env.GCP_BUCKET_NAME!;
const PROJECT_ID = process.env.GCP_PROJECT_ID!;

export const storage = new Storage({
  projectId: PROJECT_ID,
  // For Cloud Run, it will use Application Default Credentials automatically
  // For local dev, set GOOGLE_APPLICATION_CREDENTIALS env var
});

export const bucket = storage.bucket(BUCKET_NAME);

/**
 * Upload file to GCP Storage
 * @returns Public URL of uploaded file
 */
export async function uploadToGCS(
  file: Express.Multer.File,
  folder: string
): Promise<string> {
  const fileName = `${folder}/${Date.now()}-${file.originalname}`;
  const blob = bucket.file(fileName);

  const blobStream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: file.mimetype,
    },
  });

  return new Promise((resolve, reject) => {
    blobStream.on("error", (err) => reject(err));
    blobStream.on("finish", async () => {
      // Make file public
      await blob.makePublic();
      const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
      resolve(publicUrl);
    });
    blobStream.end(file.buffer);
  });
}

/**
 * Delete file from GCP Storage
 */
export async function deleteFromGCS(fileUrl: string): Promise<void> {
  try {
    const fileName = fileUrl.replace(
      `https://storage.googleapis.com/${BUCKET_NAME}/`,
      ""
    );
    await bucket.file(fileName).delete();
  } catch (error) {
    console.error("Error deleting file from GCS:", error);
  }
}
```

### Multer Configuration

```typescript
// config/multer.config.ts
import multer from "multer";
import { ValidationError } from "../utils/errors";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

// Use memory storage for GCP upload
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(new ValidationError("Only JPEG, PNG, and WebP images are allowed"));
    } else {
      cb(null, true);
    }
  },
});

export const uploadPaymentProof = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(new ValidationError("Only JPEG, PNG, and WebP images are allowed"));
    } else {
      cb(null, true);
    }
  },
});

export const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      cb(new ValidationError("Only PDF and image files are allowed"));
    } else {
      cb(null, true);
    }
  },
});
```

### Upload Middleware & Usage

```typescript
// middlewares/upload.middleware.ts
import { Request, Response, NextFunction } from "express";
import { uploadToGCS } from "../config/storage.config";

export const handleFileUpload = (folder: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next();
    }

    try {
      const fileUrl = await uploadToGCS(req.file, folder);
      (req as any).fileUrl = fileUrl;
      next();
    } catch (error) {
      next(error);
    }
  };
};
```

### Example: Avatar Upload Route

```typescript
// routes/user.routes.ts
import { Router } from "express";
import { uploadAvatar } from "../config/multer.config";
import { handleFileUpload } from "../middlewares/upload.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import userController from "../controllers/user.controller";

const router = Router();

router.post(
  "/avatar",
  authenticate,
  uploadAvatar.single("avatar"),
  handleFileUpload("avatars"),
  userController.uploadAvatar
);

export default router;
```

```typescript
// controllers/user.controller.ts
uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  const fileUrl = (req as any).fileUrl;

  if (!fileUrl) {
    throw new ValidationError("No file uploaded");
  }

  const updatedUser = await userService.updateAvatar(req.user!.sub, fileUrl);

  res.json({
    success: true,
    data: {
      avatarUrl: updatedUser.avatarUrl,
    },
  });
});
```

---

## 🎯 API Implementation Patterns

### Standard Response Format

**All successful responses:**

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Optional success message"
}
```

**All error responses:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "statusCode": 400,
    "field": "fieldName", // Optional
    "timestamp": "2026-01-11T03:00:00.000Z"
  }
}
```

### Pagination Response

```json
{
  "success": true,
  "data": {
    "items": [
      /* array of items */
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 156,
      "totalPages": 8
    }
  }
}
```

---

## 📋 Code Templates

### 1. Repository Template

```typescript
// repositories/transaction.repository.ts
import { Transaction, Prisma } from "@prisma/client";
import { DatabaseError, NotFoundError } from "../utils/errors";
import prisma from "../utils/prisma-client";

export interface CreateTransactionInput {
  classId: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  date?: Date;
  fundApplicationId?: string;
  createdById?: string;
}

export interface TransactionFilterOptions {
  classId: string;
  startDate?: Date;
  endDate?: Date;
  type?: "income" | "expense";
  page?: number;
  limit?: number;
  sortBy?: "date" | "amount";
  sortOrder?: "asc" | "desc";
}

export class TransactionRepository {
  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Transaction | null> {
    try {
      return await prisma.transaction.findUnique({
        where: { id },
      });
    } catch (error) {
      throw new DatabaseError("Failed to find transaction", error);
    }
  }

  /**
   * Find many transactions with filters
   */
  async findMany(options: TransactionFilterOptions): Promise<Transaction[]> {
    try {
      const {
        classId,
        startDate,
        endDate,
        type,
        page = 1,
        limit = 20,
        sortBy = "date",
        sortOrder = "desc",
      } = options;

      const skip = (page - 1) * limit;

      const where: Prisma.TransactionWhereInput = {
        classId,
        ...(type && { type }),
        ...(startDate &&
          endDate && {
            date: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      return await prisma.transaction.findMany({
        where,
        take: limit,
        skip,
        orderBy: {
          [sortBy]: sortOrder,
        },
      });
    } catch (error) {
      throw new DatabaseError("Failed to fetch transactions", error);
    }
  }

  /**
   * Create transaction
   */
  async create(input: CreateTransactionInput): Promise<Transaction> {
    try {
      return await prisma.transaction.create({
        data: {
          classId: input.classId,
          type: input.type,
          description: input.description,
          amount: input.amount,
          date: input.date || new Date(),
          fundApplicationId: input.fundApplicationId,
          createdById: input.createdById,
        },
      });
    } catch (error) {
      throw new DatabaseError("Failed to create transaction", error);
    }
  }

  /**
   * Get total income/expense for a class
   */
  async getTotalByType(
    classId: string,
    type: "income" | "expense",
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      const result = await prisma.transaction.aggregate({
        where: {
          classId,
          type,
          ...(startDate &&
            endDate && {
              date: {
                gte: startDate,
                lte: endDate,
              },
            }),
        },
        _sum: {
          amount: true,
        },
      });

      return Number(result._sum.amount || 0);
    } catch (error) {
      throw new DatabaseError("Failed to calculate total", error);
    }
  }

  /**
   * Count transactions
   */
  async count(
    options: Omit<TransactionFilterOptions, "page" | "limit">
  ): Promise<number> {
    try {
      const { classId, startDate, endDate, type } = options;

      const where: Prisma.TransactionWhereInput = {
        classId,
        ...(type && { type }),
        ...(startDate &&
          endDate && {
            date: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      return await prisma.transaction.count({ where });
    } catch (error) {
      throw new DatabaseError("Failed to count transactions", error);
    }
  }
}

export const transactionRepository = new TransactionRepository();
```

### 2. Service Template

```typescript
// services/transaction.service.ts
import { Transaction } from "@prisma/client";
import {
  transactionRepository,
  CreateTransactionInput,
  TransactionFilterOptions,
} from "../repositories/transaction.repository";
import { NotFoundError, ValidationError } from "../utils/errors";
import { cacheService } from "./cache.service";

export class TransactionService {
  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<Transaction> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError("Transaction ID is required", "id");
    }

    // Try cache
    const cacheKey = cacheService.generateTransactionKey(id);
    const cached = await cacheService.get<Transaction>(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch from DB
    const transaction = await transactionRepository.findById(id);

    if (!transaction) {
      throw new NotFoundError("Transaction not found", "Transaction", id);
    }

    // Cache it
    await cacheService.set(cacheKey, transaction);

    return transaction;
  }

  /**
   * Get transactions with pagination
   */
  async getTransactions(options: TransactionFilterOptions) {
    // Validate inputs
    if (options.page && options.page < 1) {
      throw new ValidationError("Page must be at least 1", "page");
    }

    if (options.limit && (options.limit < 1 || options.limit > 100)) {
      throw new ValidationError("Limit must be between 1 and 100", "limit");
    }

    // Try cache
    const cacheKey = cacheService.generateTransactionsListKey(
      options.classId,
      JSON.stringify(options)
    );
    const cached = await cacheService.get<{
      transactions: Transaction[];
      pagination: any;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch from DB
    const transactions = await transactionRepository.findMany(options);
    const totalItems = await transactionRepository.count(options);

    const result = {
      transactions,
      pagination: {
        page: options.page || 1,
        limit: options.limit || 20,
        totalItems,
        totalPages: Math.ceil(totalItems / (options.limit || 20)),
      },
    };

    // Cache it
    await cacheService.set(cacheKey, result, 600); // 10 minutes

    return result;
  }

  /**
   * Create transaction
   */
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    // Validate amount
    if (!input.amount || input.amount <= 0) {
      throw new ValidationError("Amount must be greater than 0", "amount");
    }

    // Validate description
    if (!input.description || input.description.trim().length === 0) {
      throw new ValidationError("Description is required", "description");
    }

    // Create transaction
    const transaction = await transactionRepository.create(input);

    // Invalidate caches
    await cacheService.invalidateTransactionCaches(input.classId);

    return transaction;
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(classId: string, startDate?: Date, endDate?: Date) {
    const totalIncome = await transactionRepository.getTotalByType(
      classId,
      "income",
      startDate,
      endDate
    );

    const totalExpense = await transactionRepository.getTotalByType(
      classId,
      "expense",
      startDate,
      endDate
    );

    const totalBalance = totalIncome - totalExpense;

    return {
      totalBalance,
      totalIncome,
      totalExpense,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
    };
  }
}

export const transactionService = new TransactionService();
```

### 3. Controller Template

```typescript
// controllers/transaction.controller.ts
import { Request, Response } from "express";
import { transactionService } from "../services/transaction.service";
import { asyncHandler } from "../utils/errors";

interface AuthRequest extends Request {
  user?: {
    sub: string;
    nim: string;
    role: "user" | "bendahara";
    classId: string;
  };
}

class TransactionController {
  /**
   * GET /api/transactions
   * Get list of transactions
   */
  index = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, startDate, endDate, type, sortBy, sortOrder } =
      req.query;

    const result = await transactionService.getTransactions({
      classId: req.user!.classId,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      type: type as "income" | "expense" | undefined,
      sortBy: (sortBy as "date" | "amount") || "date",
      sortOrder: (sortOrder as "asc" | "desc") || "desc",
    });

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * GET /api/transactions/:id
   * Get transaction details
   */
  show = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const transaction = await transactionService.getTransactionById(id);

    res.json({
      success: true,
      data: transaction,
    });
  });
}

export default new TransactionController();
```

### 4. Route Template

```typescript
// routes/transaction.routes.ts
import { Router } from "express";
import transactionController from "../controllers/transaction.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get("/", transactionController.index);
router.get("/:id", transactionController.show);

export default router;
```

---

## ⏰ Scheduled Jobs (Cron)

### Bill Generator Job

```typescript
// jobs/bill-generator.job.ts
import cron from "node-cron";
import prisma from "../utils/prisma-client";
import { logInfo } from "../utils/logger";

const MONTHS = [
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
];

/**
 * Generate monthly bills for all users
 * Runs on 1st of every month at 00:00
 */
export const startBillGeneratorJob = () => {
  cron.schedule("0 0 1 * *", async () => {
    logInfo("Starting monthly bill generation...");

    const now = new Date();
    const month = MONTHS[now.getMonth()];
    const year = now.getFullYear();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 10); // Due on 10th

    try {
      const users = await prisma.user.findMany({
        where: {
          classId: {
            not: null,
          },
        },
        select: {
          id: true,
          classId: true,
        },
      });

      for (const user of users) {
        // Check if bill already exists
        const existingBill = await prisma.cashBill.findFirst({
          where: {
            userId: user.id,
            month,
            year,
          },
        });

        if (!existingBill) {
          const billId = `INV-${year}${String(now.getMonth() + 1).padStart(
            2,
            "0"
          )}-${user.id.substring(0, 6)}`;

          await prisma.cashBill.create({
            data: {
              userId: user.id,
              classId: user.classId!,
              billId,
              month,
              year,
              dueDate,
              kasKelas: 30000,
              biayaAdmin: 1000,
              totalAmount: 31000,
              status: "belum_dibayar",
            },
          });

          logInfo(`Created bill ${billId} for user ${user.id}`);
        }
      }

      logInfo(`Monthly bill generation completed for ${month} ${year}`);
    } catch (error) {
      console.error("Error generating monthly bills:", error);
    }
  });

  logInfo("✅ Bill generator job scheduled");
};
```

### Register Job in Main App

```typescript
// index.ts
import { startBillGeneratorJob } from "./jobs/bill-generator.job";

// Start cron jobs
startBillGeneratorJob();
```

---

## 🚀 Deployment (Google Cloud Run)

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generated client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port expected by Cloud Run
EXPOSE 8080

# Run migrations and start server
CMD npx prisma migrate deploy && node dist/index.js
```

### Environment Setup

**Cloud Run uses port 8080 by default:**

```typescript
// env.ts
import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 8080; // Cloud Run requirement
export const DATABASE_URL = process.env.DATABASE_URL!;
export const REDIS_URL = process.env.REDIS_URL!;
export const JWT_SECRET = process.env.JWT_SECRET!;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
export const GCP_BUCKET_NAME = process.env.GCP_BUCKET_NAME!;
export const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID!;

// Validate required env vars
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!JWT_SECRET) throw new Error("JWT_SECRET is required");
// ... other validations
```

### Cloud Build Configuration

```yaml
# cloudbuild.yaml
steps:
  # Build the container image
  - name: "gcr.io/cloud-builders/docker"
    args:
      - "build"
      - "-t"
      - "gcr.io/$PROJECT_ID/galacash-api:$COMMIT_SHA"
      - "."

  # Push the container image to Container Registry
  - name: "gcr.io/cloud-builders/docker"
    args:
      - "push"
      - "gcr.io/$PROJECT_ID/galacash-api:$COMMIT_SHA"

  # Deploy container image to Cloud Run
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: gcloud
    args:
      - "run"
      - "deploy"
      - "galacash-api"
      - "--image"
      - "gcr.io/$PROJECT_ID/galacash-api:$COMMIT_SHA"
      - "--region"
      - "asia-southeast1"
      - "--platform"
      - "managed"
      - "--allow-unauthenticated"

images:
  - "gcr.io/$PROJECT_ID/galacash-api:$COMMIT_SHA"
```

### Deployment Commands

```bash
# Build and deploy to Cloud Run
gcloud run deploy galacash-api \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=postgresql://...,REDIS_URL=redis://...,JWT_SECRET=..."

# Set secrets from Secret Manager
gcloud run services update galacash-api \
  --update-secrets=DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest
```

---

## 🔧 Environment Variables

### Required Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:password@host:5432/galacash"

# Redis
REDIS_URL="redis://host:6379"

# JWT Secrets (Generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-token-secret-min-32-chars"

# GCP Storage
GCP_PROJECT_ID="your-gcp-project-id"
GCP_BUCKET_NAME="galacash-uploads"
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"  # Local dev only

# Server
PORT=8080
NODE_ENV="production"

# CORS
ALLOWED_ORIGINS="https://galacash.com,https://www.galacash.com"

# Optional
LOG_LEVEL="info"
```

### Local Development

```bash
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: galacash
      POSTGRES_PASSWORD: password
      POSTGRES_DB: galacash
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

```bash
# Start local services
docker-compose up -d

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

---

## 📚 Next Steps for Implementation

### Phase 1: Setup (Week 1)

1. ✅ Initialize project with TypeScript + Express
2. ✅ Setup Prisma with PostgreSQL
3. ✅ Create database schema and run migrations
4. ✅ Setup Redis connection
5. ✅ Configure GCP Storage
6. ✅ Setup error handling system
7. ✅ Setup Winston logging

### Phase 2: Core Features (Week 2-3)

1. ✅ Implement authentication (login, refresh, logout)
2. ✅ Implement user profile endpoints
3. ✅ Implement transaction management
4. ✅ Implement fund applications
5. ✅ Implement cash bills
6. ✅ Implement dashboard endpoints

### Phase 3: Treasurer Features (Week 4)

1. ✅ Implement bendahara-specific endpoints
2. ✅ Implement approval/rejection flows
3. ✅ Implement financial reporting
4. ✅ Setup bill generator cron job

### Phase 4: Deployment (Week 5)

1. ✅ Docker configuration
2. ✅ Cloud Run deployment
3. ✅ Environment variable setup
4. ✅ Performance testing
5. ✅ Production monitoring

---

## 🎯 Key Success Metrics

- ✅ **100% API Coverage** - All endpoints from openapi.yaml implemented
- ✅ **Type Safety** - Zero TypeScript errors
- ✅ **Performance** - All endpoints respond in < 500ms (without DB bottlenecks)
- ✅ **Security** - Bcrypt (10 rounds), JWT, rate limiting, Helmet
- ✅ **Scalability** - Redis caching reduces DB load by >50%
- ✅ **Code Quality** - Clean architecture, separation of concerns
- ✅ **Deployment** - Automated Cloud Run deployment

---

**Status**: ✅ Ready for Implementation  
**Version**: 1.0.0  
**Last Updated**: January 11, 2026

For questions or clarifications, refer to:

- `openapi.yaml` for API contracts
- `BACKEND_API_SPECIFICATION.md` for detailed endpoint specs
- This document for architecture and implementation patterns
