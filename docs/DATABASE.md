# GalaCash Database Schema

> **Last Updated:** January 19, 2026

## 📊 Data Architecture Overview

### Multi-Class Transparency Model

As of January 2026, GalaCash implements a **transparent data model** where:

- Users and bendahara can view data across **all classes** within the same angkatan (batch)
- The `classId` field is retained for:
  - Organizational purposes
  - Historical tracking
  - Future per-class filtering capabilities
  - Data relationship integrity

This architecture allows for:

- Comprehensive batch-level financial oversight
- Simplified data aggregation for reports
- Flexibility to add class-level filtering in the future if needed

---

## 📊 Entity Relationship Diagram (ERD)

```
┌─────────────────────┐
│      Class          │
├─────────────────────┤
│ id (UUID) PK        │
│ name (String)       │
│ createdAt           │
│ updatedAt           │
└────────┬────────────┘
         │ 1
         │
         │ has many
         ├──────────────────┬──────────────────┬──────────────────┐
         │                  │                  │                  │
         │ 1                │ 1                │ 1                │ 1
         ▼ *                ▼ *                ▼ *                ▼ *
    ┌─────────────┐  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────┐
    │    User     │  │   Transaction    │  │ FundApplication │  │   CashBill   │
    ├─────────────┤  ├──────────────────┤  ├─────────────────┤  ├──────────────┤
    │ id (UUID)   │  │ id (UUID) PK     │  │ id (UUID) PK    │  │ id (UUID) PK │
    │ nim (String)│  │ classId (FK)     │  │ userId (FK)     │  │ userId (FK)  │
    │ name        │  │ type             │  │ classId (FK)    │  │ classId (FK) │
    │ email       │  │ description      │  │ purpose         │  │ billId       │
    │ password    │  │ amount           │  │ description     │  │ month        │
    │ role        │  │ date             │  │ category        │  │ year         │
    │ avatarUrl   │  │ createdAt        │  │ amount          │  │ dueDate      │
    │ classId(FK) │  │                  │  │ status          │  │ kasKelas     │
    │ createdAt   │  │                  │  │ attachmentUrl   │  │ biayaAdmin   │
    │ updatedAt   │  │                  │  │ rejectionReason │  │ totalAmount  │
    └──────┬──────┘  └──────────────────┘  │ reviewedBy(FK)  │  │ status       │
           │                                │ reviewedAt      │  │ paymentMethod│
           │ 1                              │ createdAt       │  │ paymentProof │
           │ has many                       │ updatedAt       │  │ paidAt       │
           │                                └────┬────────────┘  │ confirmedBy  │
           ├──────────────────┬──────────────────┘               │ confirmedAt  │
           │                  │                                  │ createdAt    │
           │ 1                │ 1                                │ updatedAt    │
           ▼ *                ▼ *                                └──────────────┘
    ┌──────────────────┐  ┌──────────────────┐
    │  RefreshToken    │  │ (Self-relations) │
    ├──────────────────┤  │ User → Reviewer  │
    │ id (UUID) PK     │  │ User → Confirmer │
    │ token (String)   │  └──────────────────┘
    │ userId (FK)      │
    │ expiresAt        │
    │ createdAt        │
    └──────────────────┘

```

---

## 📋 Entity Details

### 1. **Class** (classes table)

Represents a student class/section.

| Column    | Type     | Constraints    | Description                  |
| --------- | -------- | -------------- | ---------------------------- |
| id        | UUID     | PRIMARY KEY    | Unique identifier            |
| name      | String   | UNIQUE         | Class name (e.g., "Class A") |
| createdAt | DateTime | DEFAULT: now() | Creation timestamp           |
| updatedAt | DateTime | AUTO_UPDATE    | Last modification timestamp  |

**Relationships:**

- 1:N with User
- 1:N with Transaction
- 1:N with FundApplication
- 1:N with CashBill

---

### 2. **User** (users table)

Represents both students and treasurers.

| Column    | Type     | Constraints          | Description                  |
| --------- | -------- | -------------------- | ---------------------------- |
| id        | UUID     | PRIMARY KEY          | Unique identifier            |
| nim       | String   | UNIQUE, INDEXED      | Student ID (unique per user) |
| name      | String   | NOT NULL             | User's full name             |
| email     | String   | NULLABLE             | User's email address         |
| password  | String   | NOT NULL             | Hashed password (bcrypt)     |
| role      | UserRole | DEFAULT: 'user'      | Either 'user' or 'bendahara' |
| avatarUrl | String   | NULLABLE             | Profile picture URL          |
| classId   | UUID     | FOREIGN KEY, INDEXED | Reference to Class           |
| createdAt | DateTime | DEFAULT: now()       | Creation timestamp           |
| updatedAt | DateTime | AUTO_UPDATE          | Last modification timestamp  |

**Indexes:**

- classId
- nim

**Relationships:**

- N:1 with Class (FK: classId)
- 1:N with RefreshToken
- 1:N with FundApplication (as Applicant)
- 1:N with FundApplication (as Reviewer - optional)
- 1:N with CashBill (as Student)
- 1:N with CashBill (as Confirmer - optional)

**Enums:**

```
enum UserRole {
    user        // Regular student
    bendahara   // Treasurer
}
```

---

### 3. **RefreshToken** (refresh_tokens table)

Stores JWT refresh tokens for session management.

| Column    | Type     | Constraints          | Description           |
| --------- | -------- | -------------------- | --------------------- |
| id        | UUID     | PRIMARY KEY          | Unique identifier     |
| token     | String   | UNIQUE               | JWT refresh token     |
| userId    | UUID     | FOREIGN KEY, INDEXED | Reference to User     |
| expiresAt | DateTime | INDEXED              | Token expiration time |
| createdAt | DateTime | DEFAULT: now()       | Creation timestamp    |

**Cascade Delete:** If User is deleted, RefreshToken is deleted

**Indexes:**

- userId
- expiresAt

**Relationships:**

- N:1 with User (FK: userId)

---

### 4. **Transaction** (transactions table)

Records all financial transactions (income/expense).

| Column      | Type            | Constraints             | Description                 |
| ----------- | --------------- | ----------------------- | --------------------------- |
| id          | UUID            | PRIMARY KEY             | Unique identifier           |
| classId     | UUID            | FOREIGN KEY, INDEXED    | Reference to Class          |
| type        | TransactionType | NOT NULL, INDEXED       | 'income' or 'expense'       |
| description | String          | NOT NULL                | Transaction description     |
| amount      | Float           | NOT NULL                | Transaction amount (Rupiah) |
| date        | DateTime        | DEFAULT: now(), INDEXED | Transaction date            |
| createdAt   | DateTime        | DEFAULT: now()          | Record creation time        |

**Indexes:**

- classId
- date
- type

**Relationships:**

- N:1 with Class (FK: classId)

**Enums:**

```
enum TransactionType {
    income      // Money coming in
    expense     // Money going out
}
```

---

### 5. **FundApplication** (fund_applications table)

Stores fund requests from students.

| Column          | Type         | Constraints                 | Description                                |
| --------------- | ------------ | --------------------------- | ------------------------------------------ |
| id              | UUID         | PRIMARY KEY                 | Unique identifier                          |
| userId          | UUID         | FOREIGN KEY, INDEXED        | Student applying (Reference to User)       |
| classId         | UUID         | FOREIGN KEY, INDEXED        | Student's class (Reference to Class)       |
| purpose         | String       | NOT NULL                    | Application purpose                        |
| description     | String       | NULLABLE                    | Detailed description                       |
| category        | FundCategory | NOT NULL                    | Category of fund (see enum)                |
| amount          | Float        | NOT NULL                    | Requested amount (Rupiah)                  |
| status          | FundStatus   | DEFAULT: 'pending', INDEXED | Current status                             |
| attachmentUrl   | String       | NULLABLE                    | Supporting document URL                    |
| rejectionReason | String       | NULLABLE                    | Reason if rejected                         |
| reviewedBy      | UUID         | NULLABLE, FOREIGN KEY       | Bendahara who reviewed (Reference to User) |
| reviewedAt      | DateTime     | NULLABLE                    | Review timestamp                           |
| createdAt       | DateTime     | DEFAULT: now(), INDEXED     | Creation timestamp                         |
| updatedAt       | DateTime     | AUTO_UPDATE                 | Last modification timestamp                |

**Indexes:**

- userId
- classId
- status
- createdAt

**Relationships:**

- N:1 with User (applicant, FK: userId)
- N:1 with Class (FK: classId)
- N:1 with User (reviewer - optional, FK: reviewedBy) - SetNull on delete

**Enums:**

```
enum FundCategory {
    education   // Educational purposes
    health      // Health-related
    emergency   // Emergency situations
    equipment   // Equipment purchases
}

enum FundStatus {
    pending     // Waiting for review
    approved    // Approved by bendahara
    rejected    // Rejected by bendahara
}
```

---

### 6. **CashBill** (cash_bills table)

Monthly class fee bills for students.

| Column          | Type          | Constraints                       | Description                                 |
| --------------- | ------------- | --------------------------------- | ------------------------------------------- |
| id              | UUID          | PRIMARY KEY                       | Unique identifier                           |
| userId          | UUID          | FOREIGN KEY, INDEXED              | Student owing (Reference to User)           |
| classId         | UUID          | FOREIGN KEY, INDEXED              | Class this bill belongs to                  |
| billId          | String        | UNIQUE                            | Human-readable bill ID                      |
| month           | String        | NOT NULL                          | Month (e.g., "January", "February")         |
| year            | Integer       | NOT NULL                          | Year                                        |
| dueDate         | DateTime      | INDEXED                           | Payment deadline                            |
| kasKelas        | Float         | NOT NULL                          | Class fund amount (default: Rp 15,000)      |
| biayaAdmin      | Float         | NOT NULL                          | Admin fee (deprecated, always 0)            |
| totalAmount     | Float         | NOT NULL                          | Total = kasKelas (biayaAdmin is 0)          |
| status          | BillStatus    | DEFAULT: 'belum_dibayar', INDEXED | Payment status                              |
| paymentMethod   | PaymentMethod | NULLABLE                          | How it was paid (if paid)                   |
| paymentProofUrl | String        | NULLABLE                          | Payment receipt/proof URL                   |
| paidAt          | DateTime      | NULLABLE                          | Payment timestamp                           |
| confirmedBy     | UUID          | NULLABLE, FOREIGN KEY             | Bendahara who confirmed (Reference to User) |
| confirmedAt     | DateTime      | NULLABLE                          | Confirmation timestamp                      |
| createdAt       | DateTime      | DEFAULT: now()                    | Record creation timestamp                   |
| updatedAt       | DateTime      | AUTO_UPDATE                       | Last modification timestamp                 |

**Unique Constraints:**

- billId (single column)
- (userId, month, year) - one bill per student per month

**Indexes:**

- userId
- classId
- status
- dueDate

**Relationships:**

- N:1 with User (student, FK: userId)
- N:1 with Class (FK: classId)
- N:1 with User (confirmer - optional, FK: confirmedBy) - SetNull on delete

**Enums:**

```
enum BillStatus {
    belum_dibayar           // Not yet paid
    menunggu_konfirmasi     // Waiting for treasurer confirmation
    sudah_dibayar           // Paid and confirmed
}

enum PaymentMethod {
    bank        // Bank transfer
    ewallet     // E-wallet (GoPay, OVO, Dana, etc.)
    cash        // Direct cash payment
}
```

---

## 🔗 Relationships Summary

### One-to-Many Relationships

| Parent | Child                       | Cardinality | Cascade          |
| ------ | --------------------------- | ----------- | ---------------- |
| Class  | User                        | 1:N         | DELETE → Cascade |
| Class  | Transaction                 | 1:N         | DELETE → Cascade |
| Class  | FundApplication             | 1:N         | DELETE → Cascade |
| Class  | CashBill                    | 1:N         | DELETE → Cascade |
| User   | RefreshToken                | 1:N         | DELETE → Cascade |
| User   | FundApplication (Applicant) | 1:N         | DELETE → Cascade |
| User   | CashBill (Student)          | 1:N         | DELETE → Cascade |

### Optional (Nullable) Relationships

| Field                      | Referenced | Cascade          |
| -------------------------- | ---------- | ---------------- |
| FundApplication.reviewedBy | User       | DELETE → SetNull |
| CashBill.confirmedBy       | User       | DELETE → SetNull |

---

## 📊 Data Flow Diagram

### Fund Application Flow

```
Student (User)
    ↓
FundApplication (created with status=pending)
    ↓
Bendahara reviews (sets reviewedBy, reviewedAt, status)
    ↓
Status becomes: approved or rejected
```

### Cash Bill Payment Flow

```
Class generates monthly bills
    ↓
CashBill created (status=belum_dibayar)
    ↓
Student uploads proof, selects payment method
    ↓
Status changes to: menunggu_konfirmasi
    ↓
Bendahara verifies and confirms
    ↓
Status becomes: sudah_dibayar
```

### Authentication Flow

```
User login with NIM + Password
    ↓
Access Token generated (1 hour)
Refresh Token generated (7 days)
    ↓
RefreshToken record created in DB
    ↓
Token stored in cookies/headers
    ↓
Client uses Access Token for requests
    ↓
When expired: use Refresh Token to get new Access Token
```

---

## 🎯 Key Design Features

### Security

- Passwords are hashed with bcrypt (never stored in plain text)
- JWT tokens with expiration
- Refresh tokens stored in database for revocation capability

### Data Integrity

- Foreign keys with proper cascade rules
- Unique constraints on billId and (userId, month, year) for CashBill
- Proper indexes on frequently queried fields

### Performance

- Indexes on foreign keys and commonly filtered fields
- Indexes on date fields for time-based queries
- Composite unique constraint on CashBill prevents duplicates

### Auditability

- `createdAt` and `updatedAt` timestamps on all records
- `reviewedAt`, `confirmedAt` fields for tracking approvals
- Reviewer and Confirmer fields track who approved what

---

## 📈 Current Data Sample

**Seeded Test Data:**

- 2 Classes
- 81 Users (1 bendahara + 80 students)
- 0 Transactions (created when bills/approvals happen)
- 0 Fund Applications (created by students)
- 0 Cash Bills (auto-generated monthly)

---

## 🔄 Database Initialization

**Prisma v7 Setup:**

- Generator: `prisma-client` (custom output: `src/generated/prisma`)
- Configuration: `prisma.config.ts`
- Migrations: `prisma/migrations/`
- Seeding: `prisma/seed.ts`

**Commands:**

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Reset database (destructive)
pnpm prisma migrate reset

# Open Prisma Studio (GUI)
pnpm prisma:studio
```
