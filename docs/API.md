# GalaCash Backend API Specification

> **Last Updated:** January 19, 2026  
> **Tech Stack:** Node.js (Express) + PostgreSQL + GCP Cloud Storage  
> **Base URL:** `/api`

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack & Architecture](#tech-stack--architecture)
3. [Authentication](#authentication)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
   - [Auth APIs](#1-authentication-apis)
   - [User APIs](#2-user-apis)
   - [Dashboard APIs](#3-dashboard-apis)
   - [Transaction APIs](#4-transaction-apis)
   - [Fund Application APIs](#5-fund-application-aju-dana-apis)
   - [Cash Bill APIs](#6-cash-bill-tagihan-kas-apis)
   - [Treasurer APIs](#7-treasurer-bendahara-apis)
6. [File Upload](#file-upload)
7. [Error Handling](#error-handling)
8. [Response Formats](#response-formats)

---

## Overview

GalaCash is a financial management application for class treasurers. The backend serves two main user roles:

| Role        | Indonesian            | Description                                                            |
| ----------- | --------------------- | ---------------------------------------------------------------------- |
| `user`      | Siswa (Student)       | Can view transactions, submit fund applications, pay bills             |
| `bendahara` | Bendahara (Treasurer) | Can manage all finances, approve/reject applications, confirm payments |

### Key Features

- **Kas Kelas**: Class fund balance tracking (income & expenses)
- **Aju Dana**: Fund request/application system
- **Tagihan Kas**: Monthly cash bill management
- **Rekap Kas**: Financial recap & reporting

### Data Transparency Model

**Important**: As of January 2026, the system implements a **transparent data model** across all classes within an angkatan (batch):

- Both `user` and `bendahara` roles can view **all financial data** across all classes in the same batch
- The `classId` field is retained in the database for organizational purposes and future filtering capabilities
- Dashboard summaries, transactions, fund applications, and cash bills aggregate data from all classes
- This design allows for comprehensive batch-level financial oversight

---

## Tech Stack & Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│  Express.js API │────▶│   PostgreSQL    │
│  (React Router) │     │    (Node.js)    │     │   (Cloud SQL)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  GCP Cloud      │
                        │  Storage        │
                        │  (File Uploads) │
                        └─────────────────┘
```

### Recommended Libraries

| Purpose          | Library                        |
| ---------------- | ------------------------------ |
| Framework        | Express.js                     |
| ORM              | Prisma                         |
| Validation       | Zod / Joi                      |
| Authentication   | jsonwebtoken (JWT)             |
| Password Hashing | bcrypt                         |
| File Upload      | multer + @google-cloud/storage |
| Database         | pg (node-postgres)             |

---

## Authentication

### Method: JWT (JSON Web Token)

Users authenticate using **NIM (Student ID) + Password**.

#### Login Flow

```
1. User submits NIM + Password
2. Server validates credentials against database
3. Server returns JWT access token + refresh token
4. Client stores tokens and includes in Authorization header
5. JWT expires → Use refresh token to get new access token
```

#### Token Structure

```json
// Access Token Payload
{
  "sub": "user_uuid",
  "nim": "1313612345",
  "role": "user" | "bendahara",
  "classId": "class_uuid",
  "iat": 1704931200,
  "exp": 1704934800  // 1 hour expiry
}
```

#### Authorization Header

```
Authorization: Bearer <access_token>
```

#### Role-Based Access Control

| Endpoint Pattern   | Required Role         |
| ------------------ | --------------------- |
| `/api/auth/*`      | Public (no auth)      |
| `/api/users/*`     | `user` or `bendahara` |
| `/api/bendahara/*` | `bendahara` only      |

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│    Class     │       │     User     │       │   Transaction    │
├──────────────┤       ├──────────────┤       ├──────────────────┤
│ id (PK)      │◀──┐   │ id (PK)      │       │ id (PK)          │
│ name         │   │   │ nim          │   ┌──▶│ classId (FK)     │
│ createdAt    │   └───│ classId (FK) │   │   │ type             │
│ updatedAt    │       │ name         │   │   │ description      │
└──────────────┘       │ email        │   │   │ amount           │
                       │ password     │   │   │ date             │
                       │ role         │   │   │ fundApplicationId│
                       │ avatarUrl    │   │   │ createdAt        │
                       │ createdAt    │   │   └──────────────────┘
                       │ updatedAt    │   │
                       └──────┬───────┘   │
                              │           │
              ┌───────────────┼───────────┘
              │               │
              ▼               ▼
┌──────────────────┐   ┌──────────────────┐
│ FundApplication  │   │     CashBill     │
├──────────────────┤   ├──────────────────┤
│ id (PK)          │   │ id (PK)          │
│ userId (FK)      │   │ userId (FK)      │
│ classId (FK)     │   │ classId (FK)     │
│ purpose          │   │ billId           │
│ description      │   │ month            │
│ category         │   │ year             │
│ amount           │   │ dueDate          │
│ status           │   │ kasKelas         │
│ attachmentUrl    │   │ biayaAdmin       │
│ rejectionReason  │   │ totalAmount      │
│ reviewedBy (FK)  │   │ status           │
│ reviewedAt       │   │ paymentMethod    │
│ createdAt        │   │ paymentProofUrl  │
│ updatedAt        │   │ paidAt           │
└──────────────────┘   │ confirmedBy (FK) │
                       │ confirmedAt      │
                       │ createdAt        │
                       │ updatedAt        │
                       └──────────────────┘
```

### SQL Schema (PostgreSQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
CREATE TYPE user_role AS ENUM ('user', 'bendahara');
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE fund_category AS ENUM ('education', 'health', 'emergency', 'equipment');
CREATE TYPE fund_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE bill_status AS ENUM ('belum_dibayar', 'menunggu_konfirmasi', 'sudah_dibayar');
CREATE TYPE payment_method AS ENUM ('bank', 'ewallet', 'cash');

-- Classes Table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nim VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NIM validation constraint (must start with 13136 and be 10 digits)
ALTER TABLE users ADD CONSTRAINT check_nim_format
    CHECK (nim ~ '^13136[0-9]{5}$');

-- Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    fund_application_id UUID REFERENCES fund_applications(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Applications Table
CREATE TABLE fund_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    purpose VARCHAR(255) NOT NULL,
    description TEXT,
    category fund_category NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status fund_status DEFAULT 'pending',
    attachment_url TEXT,
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash Bills Table
CREATE TABLE cash_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    bill_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., INV-20241201-020-001
    month VARCHAR(20) NOT NULL, -- e.g., "Desember"
    year INTEGER NOT NULL,
    due_date DATE NOT NULL,
    kas_kelas DECIMAL(15, 2) NOT NULL DEFAULT 30000,
    biaya_admin DECIMAL(15, 2) NOT NULL DEFAULT 1000,
    total_amount DECIMAL(15, 2) GENERATED ALWAYS AS (kas_kelas + biaya_admin) STORED,
    status bill_status DEFAULT 'belum_dibayar',
    payment_method payment_method,
    payment_proof_url TEXT,
    paid_at TIMESTAMP,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: one bill per user per month/year
ALTER TABLE cash_bills ADD CONSTRAINT unique_user_month_bill
    UNIQUE (user_id, month, year);

-- Indexes for performance
CREATE INDEX idx_users_class ON users(class_id);
CREATE INDEX idx_users_nim ON users(nim);
CREATE INDEX idx_transactions_class ON transactions(class_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_fund_applications_user ON fund_applications(user_id);
CREATE INDEX idx_fund_applications_status ON fund_applications(status);
CREATE INDEX idx_cash_bills_user ON cash_bills(user_id);
CREATE INDEX idx_cash_bills_status ON cash_bills(status);
CREATE INDEX idx_cash_bills_due_date ON cash_bills(due_date);
```

### Prisma Schema (Alternative)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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

model Class {
  id               String            @id @default(uuid())
  name             String            @db.VarChar(100)
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")

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

  class               Class?            @relation(fields: [classId], references: [id])
  fundApplications    FundApplication[] @relation("Applicant")
  reviewedApplications FundApplication[] @relation("Reviewer")
  cashBills           CashBill[]        @relation("BillOwner")
  confirmedBills      CashBill[]        @relation("BillConfirmer")
  createdTransactions Transaction[]

  @@map("users")
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
  @@map("cash_bills")
}
```

---

## API Endpoints

### 1. Authentication APIs

#### POST `/api/auth/login`

Authenticate user with NIM and password.

**Request Body:**

```json
{
  "nim": "1313612345",
  "password": "password123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "nim": "1313612345",
      "name": "Ridwan Alfarezi",
      "email": null,
      "role": "user",
      "classId": "uuid",
      "className": "Kelas A",
      "avatarUrl": null
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 3600
    }
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "NIM atau password salah"
  }
}
```

---

#### POST `/api/auth/refresh`

Refresh access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

---

#### POST `/api/auth/logout`

Invalidate refresh token.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### GET `/api/auth/me`

Get current authenticated user info.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nim": "1313612345",
    "name": "Ridwan Alfarezi",
    "email": null,
    "role": "user",
    "classId": "uuid",
    "className": "Kelas A",
    "avatarUrl": "https://storage.googleapis.com/..."
  }
}
```

---

### 2. User APIs

#### GET `/api/users/profile`

Get current user profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response:** Same as `/auth/me`

---

#### PUT `/api/users/profile`

Update user profile.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "name": "Ridwan Alfarezi Updated",
  "email": "ridwan@example.com" // Only for bendahara
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nim": "1313612345",
    "name": "Ridwan Alfarezi Updated",
    "email": "ridwan@example.com",
    "role": "user",
    "classId": "uuid",
    "avatarUrl": null
  }
}
```

---

#### PUT `/api/users/password`

Change user password.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "oldPassword": "currentPassword123",
  "newPassword": "newPassword456",
  "confirmPassword": "newPassword456"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Password berhasil diubah. Silakan login kembali."
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_OLD_PASSWORD",
    "message": "Password lama tidak sesuai"
  }
}
```

---

#### POST `/api/users/avatar`

Upload user avatar.

**Headers:**

- `Authorization: Bearer <access_token>`
- `Content-Type: multipart/form-data`

**Request Body (FormData):**

- `avatar`: File (image/jpeg, image/png, image/webp) max 5MB

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "avatarUrl": "https://storage.googleapis.com/galacash-bucket/avatars/uuid.jpg"
  }
}
```

---

### 3. Dashboard APIs

#### GET `/api/dashboard/summary`

Get financial summary for dashboard across all classes.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | `string` | No | Filter start date (YYYY-MM-DD) |
| `endDate` | `string` | No | Filter end date (YYYY-MM-DD) |

**Behavior:**

- Returns aggregated financial data across **all classes** in the user's batch
- When date filters are provided, only transactions within the range are included
- Without date filters, returns complete historical data

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totalBalance": 1573428.69,
    "totalIncome": 2500000.0,
    "totalExpense": 926571.31
  },
  "message": "Summary fetched"
}
```

**Note:** The `period` field has been removed; use query parameters for date filtering.

---

#### GET `/api/dashboard/pending-bills`

Get user's pending bills summary.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totalUnpaid": 60000,
    "billCount": 2,
    "earliestDueDate": "2025-06-01",
    "latestDueDate": "2025-07-31",
    "bills": [
      {
        "id": "uuid",
        "month": "Juni",
        "totalAmount": 31000,
        "dueDate": "2025-06-30",
        "status": "belum_dibayar"
      }
    ]
  }
}
```

---

#### GET `/api/dashboard/pending-applications`

Get user's pending fund applications.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "count": 2,
    "applications": [
      {
        "id": "uuid",
        "purpose": "Pembelian ATK",
        "amount": 150000,
        "status": "pending",
        "createdAt": "2024-03-20T10:00:00Z"
      }
    ]
  }
}
```

---

### 4. Transaction APIs

#### GET `/api/transactions`

Get list of transactions.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | `number` | No | Page number (default: 1) |
| `limit` | `number` | No | Items per page (default: 20, max: 100) |
| `startDate` | `string` | No | Filter start date (YYYY-MM-DD) |
| `endDate` | `string` | No | Filter end date (YYYY-MM-DD) |
| `type` | `string` | No | Filter by type: `income` or `expense` |
| `sortBy` | `string` | No | Sort field: `date`, `amount`, `type` |
| `sortOrder` | `string` | No | Sort direction: `asc` or `desc` |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "type": "income",
        "description": "Iuran Kas - Ridwan Alfarezi",
        "amount": 30000,
        "date": "2025-07-01"
      },
      {
        "id": "uuid",
        "type": "expense",
        "description": "Pembelian ATK",
        "amount": 150000,
        "date": "2025-07-01"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 45,
      "totalPages": 3
    }
  }
}
```

---

#### GET `/api/transactions/:id`

Get transaction details.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "expense",
    "description": "Pembelian ATK",
    "amount": 150000,
    "date": "2025-07-01",
    "createdAt": "2025-07-01T10:30:00Z",
    "fundApplication": {
      "id": "uuid",
      "purpose": "Pembelian ATK",
      "applicant": "Ridwan Alfarezi"
    }
  }
}
```

---

#### GET `/api/transactions/chart-data`

Get transaction data for charts (pie chart).

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | Yes | `income` or `expense` |
| `startDate` | `string` | No | Filter start date |
| `endDate` | `string` | No | Filter end date |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "type": "income",
    "total": 1000000,
    "breakdown": [
      { "name": "Pembayaran SPP", "value": 500000, "percentage": 50 },
      { "name": "Donasi Kegiatan", "value": 200000, "percentage": 20 },
      { "name": "Infaq Bulanan", "value": 300000, "percentage": 30 }
    ]
  }
}
```

---

#### POST `/api/transactions/export`

Export transactions to file.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "format": "xlsx", // "xlsx" or "pdf"
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "type": "all" // "all", "income", or "expense"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage.googleapis.com/galacash/exports/transactions-2025.xlsx",
    "expiresAt": "2025-01-11T03:00:00Z"
  }
}
```

---

### 5. Fund Application (Aju Dana) APIs

#### GET `/api/fund-applications`

Get all fund applications (visible to all class members).

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | `number` | No | Page number (default: 1) |
| `limit` | `number` | No | Items per page (default: 20) |
| `status` | `string` | No | Filter: `pending`, `approved`, `rejected` |
| `category` | `string` | No | Filter: `education`, `health`, `emergency`, `equipment` |
| `applicantId` | `string` | No | Filter by applicant user ID |
| `minAmount` | `number` | No | Minimum amount filter |
| `maxAmount` | `number` | No | Maximum amount filter |
| `sortBy` | `string` | No | Sort field: `date`, `amount`, `status` |
| `sortOrder` | `string` | No | Sort direction: `asc` or `desc` |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "uuid",
        "date": "2023-09-28",
        "purpose": "Lorem ipsum dolor sit amet",
        "category": "education",
        "status": "pending",
        "amount": 99999999,
        "applicant": {
          "id": "uuid",
          "name": "Ridwan Alfarezi"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 10,
      "totalPages": 1
    }
  }
}
```

---

#### GET `/api/fund-applications/my`

Get current user's fund applications only.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:** Same as `/fund-applications`

**Response:** Same structure as `/fund-applications`

---

#### GET `/api/fund-applications/:id`

Get fund application details.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "purpose": "Pembelian ATK",
    "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    "category": "equipment",
    "amount": 150000,
    "status": "pending",
    "attachmentUrl": "https://storage.googleapis.com/galacash/attachments/photo.png",
    "applicant": {
      "id": "uuid",
      "name": "Ridwan Alfarezi"
    },
    "rejectionReason": null,
    "reviewedBy": null,
    "reviewedAt": null,
    "createdAt": "2024-03-20T10:00:00Z"
  }
}
```

---

#### POST `/api/fund-applications`

Create new fund application.

**Headers:**

- `Authorization: Bearer <access_token>`
- `Content-Type: multipart/form-data`

**Request Body (FormData):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `purpose` | `string` | Yes | Brief purpose (max 255 chars) |
| `description` | `string` | No | Detailed description |
| `category` | `string` | Yes | `education`, `health`, `emergency`, `equipment` |
| `amount` | `number` | Yes | Requested amount |
| `attachment` | `File` | No | Supporting document (image/pdf, max 10MB) |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "purpose": "Pembelian ATK",
    "description": "Pembelian alat tulis untuk kelas",
    "category": "equipment",
    "amount": 150000,
    "status": "pending",
    "attachmentUrl": "https://storage.googleapis.com/...",
    "createdAt": "2024-03-20T10:00:00Z"
  },
  "message": "Pengajuan dana berhasil dibuat"
}
```

---

#### POST `/api/fund-applications/export`

Export fund applications to file.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "format": "xlsx",
  "status": "all",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

---

### 6. Cash Bill (Tagihan Kas) APIs

#### GET `/api/cash-bills`

Get list of cash bills for current user.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | `number` | No | Page number |
| `limit` | `number` | No | Items per page |
| `status` | `string` | No | Filter by status |
| `month` | `string` | No | Filter by month name |
| `year` | `number` | No | Filter by year |
| `sortBy` | `string` | No | Sort field |
| `sortOrder` | `string` | No | Sort direction |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "bills": [
      {
        "id": "uuid",
        "billId": "INV-20241201-020-001",
        "month": "Desember",
        "year": 2024,
        "status": "belum_dibayar",
        "dueDate": "2024-12-31",
        "totalAmount": 31000
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 4,
      "totalPages": 1
    }
  }
}
```

---

#### GET `/api/cash-bills/:id`

Get cash bill details.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "billId": "INV-20241201-020-001",
    "month": "Desember",
    "year": 2024,
    "status": "belum_dibayar",
    "dueDate": "2024-12-31",
    "name": "Ridwan Alfarezi",
    "kasKelas": 30000,
    "biayaAdmin": 1000,
    "totalAmount": 31000,
    "paymentMethod": null,
    "paymentProofUrl": null,
    "paidAt": null,
    "confirmedAt": null
  }
}
```

---

#### POST `/api/cash-bills/:id/pay`

Submit payment for a cash bill.

**Headers:**

- `Authorization: Bearer <access_token>`
- `Content-Type: multipart/form-data`

**Request Body (FormData):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentMethod` | `string` | Yes | `bank`, `ewallet`, or `cash` |
| `paymentProof` | `File` | Yes | Payment proof image (max 10MB) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "billId": "INV-20241201-020-001",
    "status": "menunggu_konfirmasi",
    "paymentMethod": "bank",
    "paymentProofUrl": "https://storage.googleapis.com/...",
    "paidAt": "2024-12-15T14:30:00Z"
  },
  "message": "Bukti pembayaran berhasil diunggah. Menunggu konfirmasi bendahara."
}
```

---

#### POST `/api/cash-bills/:id/cancel-payment`

Cancel payment (revert to unpaid).

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "billId": "INV-20241201-020-001",
    "status": "belum_dibayar"
  },
  "message": "Pembayaran berhasil dibatalkan"
}
```

---

### 7. Treasurer (Bendahara) APIs

> **Note:** All endpoints in this section require `role: bendahara`

---

#### GET `/api/bendahara/dashboard`

Get treasurer dashboard overview with data across all classes.

**Headers:** `Authorization: Bearer <access_token>`

**Behavior:**

- Returns aggregated data from **all classes** in the batch
- No date filtering; shows current state snapshot
- For date-filtered summaries, use `/api/bendahara/rekap-kas` endpoint

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totalBalance": 1573428.69,
    "totalIncome": 2500000.0,
    "totalExpense": 926571.31,
    "totalStudents": 120,
    "recentTransactions": [
      {
        "id": "uuid",
        "type": "income",
        "description": "Iuran Kas - Ridwan Alfarezi",
        "amount": 31000,
        "date": "2024-12-20",
        "classId": "uuid"
      }
    ],
    "recentFundApplications": [
      {
        "id": "uuid",
        "applicant": {
          "id": "uuid",
          "name": "Ahmad Zaki"
        },
        "purpose": "Beli printer kelas",
        "amount": 500000,
        "status": "pending",
        "date": "2024-12-15"
      }
    ],
    "recentCashBills": [
      {
        "id": "uuid",
        "user": {
          "name": "Siti Nurhaliza",
          "nim": "1313612346"
        },
        "month": "Desember",
        "totalAmount": 31000,
        "status": "menunggu_konfirmasi",
        "dueDate": "2024-12-31"
      }
    ]
  },
  "message": "Dashboard fetched"
}
```

---

#### GET `/api/bendahara/fund-applications`

Get all fund applications for review.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:** Same as `/fund-applications`

---

#### POST `/api/bendahara/fund-applications/:id/approve`

Approve a fund application.

**Headers:** `Authorization: Bearer <access_token>`

**Business Logic:**

1. Change application status to `approved`
2. **Auto-create expense transaction** with the application amount
3. Record reviewer info and timestamp

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "application": {
      "id": "uuid",
      "status": "approved",
      "reviewedBy": {
        "id": "uuid",
        "name": "Fathya Khairani"
      },
      "reviewedAt": "2024-03-21T09:00:00Z"
    },
    "transaction": {
      "id": "uuid",
      "type": "expense",
      "description": "Pembelian ATK - Diajukan oleh Ridwan Alfarezi",
      "amount": 150000,
      "date": "2024-03-21"
    }
  },
  "message": "Pengajuan dana berhasil disetujui dan transaksi telah dibuat"
}
```

---

#### POST `/api/bendahara/fund-applications/:id/reject`

Reject a fund application.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "rejectionReason": "Dana tidak mencukupi untuk periode ini"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "rejected",
    "rejectionReason": "Dana tidak mencukupi untuk periode ini",
    "reviewedBy": {
      "id": "uuid",
      "name": "Fathya Khairani"
    },
    "reviewedAt": "2024-03-21T09:00:00Z"
  },
  "message": "Pengajuan dana berhasil ditolak"
}
```

---

#### GET `/api/bendahara/cash-bills`

Get all cash bills across all classes for review.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | `number` | No | Page number (default: 1) |
| `limit` | `number` | No | Items per page (default: 20) |
| `status` | `string` | No | Filter by status |
| `userId` | `string` | No | Filter by student |
| `month` | `string` | No | Filter by month |
| `year` | `number` | No | Filter by year |

**Behavior:**

- Returns bills from **all classes** in the batch
- Results are paginated for performance

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "bills": [
      {
        "id": "uuid",
        "billId": "INV-20241201-020-001",
        "user": {
          "id": "uuid",
          "name": "Ridwan Alfarezi",
          "nim": "1313612345"
        },
        "month": "Desember",
        "year": 2024,
        "status": "menunggu_konfirmasi",
        "dueDate": "2024-12-31",
        "totalAmount": 31000,
        "paymentProofUrl": "https://..."
      }
    ],
    "pagination": {...}
  }
}
```

---

#### POST `/api/bendahara/cash-bills/:id/confirm`

Confirm a payment for a cash bill.

**Headers:** `Authorization: Bearer <access_token>`

**Business Logic:**

1. Change bill status to `sudah_dibayar`
2. **Auto-create income transaction** with the bill amount
3. Record confirmer info and timestamp

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "bill": {
      "id": "uuid",
      "billId": "INV-20241201-020-001",
      "status": "sudah_dibayar",
      "confirmedBy": {
        "id": "uuid",
        "name": "Fathya Khairani"
      },
      "confirmedAt": "2024-12-20T10:00:00Z"
    },
    "transaction": {
      "id": "uuid",
      "type": "income",
      "description": "Iuran Kas Desember 2024 - Ridwan Alfarezi",
      "amount": 31000,
      "date": "2024-12-20"
    }
  },
  "message": "Pembayaran berhasil dikonfirmasi"
}
```

---

#### POST `/api/bendahara/cash-bills/:id/reject`

Reject a payment (if proof is invalid).

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "belum_dibayar",
    "paymentProofUrl": null,
    "paymentMethod": null,
    "paidAt": null
  },
  "message": "Pembayaran ditolak. Siswa harus mengunggah ulang bukti pembayaran."
}
```

---

#### GET `/api/bendahara/rekap-kas`

Get financial recap report across all classes.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | `string` | No | Start date (YYYY-MM-DD) |
| `endDate` | `string` | No | End date (YYYY-MM-DD) |

**Behavior:**

- Returns aggregated financial data from **all classes**
- Date filtering applies to transaction timestamps
- Without date filters, returns complete historical summary

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totalIncome": 2500000.0,
    "totalExpense": 926571.31,
    "totalBalance": 1573428.69,
    "transactionCount": 150
  },
  "message": "Rekap kas fetched"
}
```

**Note:** The detailed breakdown fields (`incomeBreakdown`, `expenseBreakdown`, `monthlyTrend`) are available in the frontend implementation but not currently returned by this endpoint.

---

#### POST `/api/bendahara/rekap-kas/export`

Export financial recap.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "format": "pdf",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

---

#### GET `/api/bendahara/students`

Get list of all students across all classes in the batch.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | `number` | No | Page number (default: 1) |
| `limit` | `number` | No | Items per page (default: 10) |
| `search` | `string` | No | Search by name or NIM |

**Behavior:**

- Returns students from **all classes** in the batch
- Results are paginated for performance
- Search is case-insensitive and matches partial strings

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "uuid",
        "nim": "1313612345",
        "name": "Ridwan Alfarezi",
        "email": "ridwan@example.com",
        "avatarUrl": null,
        "classId": "uuid"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 120,
      "totalPages": 12
    }
  },
  "message": "Students fetched"
}
```

---

## File Upload

### GCP Cloud Storage Configuration

| Bucket            | Purpose     | Path Pattern                 |
| ----------------- | ----------- | ---------------------------- |
| `galacash-bucket` | All uploads | `{type}/{userId}/{filename}` |

### Upload Types

| Type             | Max Size | Allowed Extensions   | Path                                   |
| ---------------- | -------- | -------------------- | -------------------------------------- |
| `avatars`        | 5 MB     | jpg, jpeg, png, webp | `avatars/{userId}/{uuid}.{ext}`        |
| `attachments`    | 10 MB    | jpg, jpeg, png, pdf  | `attachments/{userId}/{uuid}.{ext}`    |
| `payment-proofs` | 10 MB    | jpg, jpeg, png       | `payment-proofs/{userId}/{uuid}.{ext}` |
| `exports`        | -        | xlsx, pdf            | `exports/{classId}/{filename}`         |

### Signed URL Pattern

All uploaded files should generate signed URLs with 1-hour expiry for secure access.

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional info
  }
}
```

### Error Codes

| HTTP | Code                  | Description              |
| ---- | --------------------- | ------------------------ |
| 400  | `VALIDATION_ERROR`    | Invalid request body     |
| 400  | `INVALID_FILE_TYPE`   | Unsupported file type    |
| 400  | `FILE_TOO_LARGE`      | File exceeds size limit  |
| 401  | `UNAUTHORIZED`        | Missing or invalid token |
| 401  | `TOKEN_EXPIRED`       | Access token expired     |
| 401  | `INVALID_CREDENTIALS` | Wrong NIM or password    |
| 403  | `FORBIDDEN`           | Insufficient permissions |
| 404  | `NOT_FOUND`           | Resource not found       |
| 409  | `CONFLICT`            | Duplicate entry          |
| 422  | `BUSINESS_ERROR`      | Business rule violation  |
| 500  | `INTERNAL_ERROR`      | Server error             |

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### List Response with Pagination

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 100,
      "totalPages": 5
    }
  }
}
```

### Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": {
        "nim": ["NIM harus 10 digit"],
        "password": ["Password minimal 8 karakter"]
      }
    }
  }
}
```

---

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database (GCP Cloud SQL)
DATABASE_URL=postgresql://user:password@host:5432/galacash

# JWT
JWT_SECRET=your-super-secret-key
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# GCP
GCP_PROJECT_ID=your-project-id
GCP_STORAGE_BUCKET=galacash-bucket
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# App
FRONTEND_URL=https://galacash.com
```

---

## Cron Jobs

### Auto-generate Monthly Bills

```
Schedule: 1st day of each month at 00:01
Job: Generate cash bills for all students in each class
```

```typescript
// Pseudocode
async function generateMonthlyBills() {
  const classes = await getActiveClasses();
  const currentMonth = getCurrentMonthName(); // e.g., "Januari"
  const currentYear = new Date().getFullYear();
  const dueDate = getLastDayOfMonth();

  for (const classItem of classes) {
    const students = await getStudentsByClass(classItem.id);

    for (const student of students) {
      await createCashBill({
        userId: student.id,
        classId: classItem.id,
        billId: generateBillId(student, currentMonth, currentYear),
        month: currentMonth,
        year: currentYear,
        dueDate: dueDate,
        kasKelas: 30000, // Configurable per class
        biayaAdmin: 1000,
        status: "belum_dibayar",
      });
    }
  }
}
```

---

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Implement rate limiting
- [ ] Sanitize all user inputs
- [ ] Use parameterized queries (Prisma handles this)
- [ ] Hash passwords with bcrypt (min 12 rounds)
- [ ] Validate JWT on every protected route
- [ ] Set secure and httpOnly flags on cookies
- [ ] Implement CORS properly
- [ ] Log all authentication attempts
- [ ] Validate file uploads (type, size, content)

---

## Payment Accounts (Hardcoded)

These are displayed to users when paying bills:

### Bank Accounts

| Bank    | Account Name       | Account Number  |
| ------- | ------------------ | --------------- |
| Mandiri | Fathya Khairani R  | 123-456-789-000 |
| Mandiri | Careal Alif Mafazi | 123-456-789-000 |

### E-Wallet Accounts

| Provider | Account Name       | Phone Number   |
| -------- | ------------------ | -------------- |
| GoPay    | Fathya Khairani R  | 0812-3456-7890 |
| OVO      | Careal Alif Mafazi | 0856-7890-1234 |
| DANA     | Fathya Khairani R  | 0821-9876-5432 |

---

## Appendix: Category Translations

| English   | Indonesian |
| --------- | ---------- |
| education | Pendidikan |
| health    | Kesehatan  |
| emergency | Darurat    |
| equipment | Peralatan  |

---

**Document prepared for GalaCash Backend Development Team**
