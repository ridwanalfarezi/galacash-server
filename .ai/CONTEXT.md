# GalaCash Context

Critical knowledge for engineers working on the GalaCash financial management system.

---

## Core Domain Concepts

**Student Financial Management System**

- Designed for Indonesian university class treasurers ("bendahara")
- NIM format: `13136[0-9]{5}` (10 digits, starts with 13136)
- Currency: Indonesian Rupiah (IDR) implied throughout
- Localized for Indonesia: Bahasa Indonesia labels, Asia/Jakarta timezone

**Multi-Class Transparency Model**

- All users within the same angkatan (batch) can view aggregated data across classes
- `classId` retained for organizational purposes and future filtering
- Treasurer (bendahara) has visibility across all classes, not just their own

---

## Critical Business Rules

### Authentication & Identity

- **NIM Uniqueness**: NIM is the primary identifier; pattern `^13136[0-9]{5}$` is enforced
- **Email Optional**: Email field is optional but must be unique if provided
- **Role Binary**: Only two roles exist: `user` (student) and `bendahara` (treasurer)
- **Password Minimum**: 8 characters minimum, hashed with bcrypt cost factor 10

### Cash Bill (Kas Kelas) System

- **Monthly Billing Cycle**: Bills generated automatically on 1st of each month
- **Holiday Exclusions**: Months 1, 2, 7, 8 (Jan, Feb, Jul, Aug) are excluded - these are semester break months
- **Default Amount**: Rp 15,000 per month (`KAS_KELAS_AMOUNT` env var)
- **Admin Fee**: Currently hardcoded to 0 (`BIAYA_ADMIN = 0`)
- **Unique Constraint**: One bill per user per month/year (DB-enforced at `@@unique([userId, month, year])`)

### Bill State Machine

```
belum_dibayar (Unpaid)
  ├─ student pays ──> menunggu_konfirmasi (Pending Confirmation)
  │                    ├─ treasurer confirms ──> sudah_dibayar (Paid) + creates income transaction
  │                    ├─ treasurer rejects ──> belum_dibayar (reset)
  │                    └─ student cancels ──> belum_dibayar (reset)
```

**State Transition Guards:**

- Can ONLY pay bills with status `belum_dibayar`
- Can ONLY cancel payments with status `menunggu_konfirmasi`
- Can ONLY confirm/reject bills with status `menunggu_konfirmasi`

### Fund Application Workflow

- **Immutable After Review**: Cannot approve/reject already-reviewed applications
- **Auto-Transaction Creation**: Approving fund application automatically creates an expense transaction
- **Rejection Requires Reason**: Rejection is invalid without providing a reason

---

## Critical Invariants That Must Hold

### Financial Integrity

1. **Balance Formula**: `Balance = Total Income - Total Expense` (calculated via Prisma aggregate `_sum`)
2. **Decimal Precision**: All financial amounts use `Decimal(12,2)` in DB; explicitly converted to Number for API
3. **Auto-Transaction Atomicity**: Payment confirmation and fund approval are wrapped in database transactions

### Authorization

1. **Bill Ownership**: Students can ONLY access/pay their OWN bills (`bill.userId !== userId` check)
2. **Role Restriction**: Bendahara-only operations guarded by `requireRole(["bendahara"])`
3. **Optimistic Locking**: Payment confirmation uses `updateMany` with WHERE clause to prevent race conditions

### Data Consistency

1. **Cache Invalidation**: All mutations invalidate related cache patterns immediately
2. **Cache TTL Strategy**:
   - User data: 1 hour (3600s)
   - Transactions: 5 minutes (300s)
   - Dashboard: 1 minute (60s) - high volatility
   - Charts: 10 minutes (600s)
   - Student lists: 10 minutes (600s)

---

## Implicit Assumptions

### Academic Calendar

- **Two-Semester System**: Holiday months suggest Jan-Feb and Jul-Aug breaks
- **Monthly Billing**: Fixed monthly cycle, not customizable periods
- **No Partial Payments**: Bills are binary (paid/unpaid), no partial payment support

### Organizational Model

- **Single Treasurer per Class**: System assumes one bendahara per class
- **Cross-Class Transparency**: Transaction aggregates span all classes in batch
- **No Soft Deletes**: Records are hard deleted (no `deletedAt` fields)
- **No Audit Trail**: No explicit audit logging of who changed what

### Technical Assumptions

- **GCP Dependency**: File uploads require GCP configuration (graceful degradation available)
- **Redis Dependency**: Caching requires Redis (graceful degradation if unavailable)
- **PostgreSQL**: Must support Prisma's Decimal type for financial precision

---

## Architectural Landmines

### High Blast-Radius Areas

**1. Bill Generation Job** (`jobs/bill-generator.job.ts`)

- **Duplicate Risk**: Cron job runs monthly; unique constraint prevents duplicates but error handling must be graceful
- **Race Conditions**: Multiple simultaneous runs could cause issues
- **Holiday Logic**: Hardcoded months `[1, 2, 7, 8]` - changing academic calendar requires code change

**2. Payment Confirmation** (`services/bendahara.service.ts:372-481`)

- **Financial Impact**: Auto-creates income transaction upon confirmation
- **Optimistic Locking**: Uses `updateMany` with WHERE clause (lines 395-412)
- **Race Condition Check**: Throws error if `updateResult.count === 0`
- **Atomic Transaction**: Bill update and transaction creation MUST succeed together or fail together

**3. Fund Approval** (`services/bendahara.service.ts:199-268`)

- **Auto-Transaction**: Approving fund application auto-creates expense transaction
- **Category Mapping**: Fund categories mapped to transaction categories via `mapFundCategoryToTransactionCategory()`

### Performance-Sensitive Paths

**1. Balance Calculations** (`services/transaction.service.ts`)

- Uses Prisma `aggregate` with `_sum` instead of fetching all rows
- Parallel queries for income and expense aggregates via `Promise.all`
- Jakarta timezone used for all chart data grouping

**2. Rekap Kas Generation** (`services/bendahara.service.ts:529-709`)

- Complex aggregation across students, bills, and transactions
- Filters by `paymentStatus: "up-to-date" | "has-arrears"`
- Pagination with total count calculation

**3. Cache Pattern Invalidation** (`services/cache.service.ts:85-92`)

- Uses Redis SCAN (not KEYS) for pattern matching
- Graceful fallback if Redis unavailable

---

## Security-Sensitive Logic

### Authentication

- **JWT Access Token**: 1 hour expiry (`ACCESS_TOKEN_EXPIRY = "1h"`)
- **JWT Refresh Token**: 7 days expiry (`REFRESH_TOKEN_EXPIRY = "7d"`)
- **Token Storage**: Refresh tokens stored in DB with expiration
- **Cookie-Based**: Access token from cookie preferred, fallback to Authorization header

### Authorization Patterns

```typescript
// Ownership Check Pattern
private checkOwnership(bill: CashBill, userId: string): void {
  if (bill.userId !== userId) {
    throw new AuthorizationError("This bill does not belong to you");
  }
}
```

### File Upload Security

- **Max Size**: 10MB general, 5MB for avatars
- **Allowed Types**: JPEG, PNG, WebP, PDF
- **Extension + MIME Validation**: Both checks performed
- **GCP Storage**: Files uploaded to GCS with public URLs

### Cron Job Security

- **Secret Key Verification**: `X-CloudScheduler-Key` header check
- **User-Agent Validation**: Checks for `Google-Cloud-Scheduler`
- **Development Bypass**: Allowed when `NODE_ENV=development` and no secret configured

---

## Critical Magic Numbers

### Business Values

| Value              | Location                   | Purpose                                 |
| ------------------ | -------------------------- | --------------------------------------- |
| `[1, 2, 7, 8]`     | `bill-generator.job.ts:23` | Holiday months (semester breaks)        |
| `10 * 1024 * 1024` | `multer.config.ts:4`       | Max file size (10MB)                    |
| `5 * 1024 * 1024`  | `multer.config.ts:5`       | Max avatar size (5MB)                   |
| `10000`            | `export.service.ts`        | Export limit (rows)                     |
| `50`               | `bendahara.service.ts:680` | Recent transactions limit for rekap kas |
| `1000`             | `user.service.ts:168`      | Classmate fetch limit                   |

### Rate Limits

| Endpoint Type            | Window | Max Requests |
| ------------------------ | ------ | ------------ |
| Auth                     | 15 min | 100          |
| General API              | 1 min  | 1000         |
| Upload                   | 15 min | 50           |
| Strict (password change) | 15 min | 30           |

---

## Error Code Meanings

### Business Logic Errors

- `INVALID_STATUS_TRANSITION`: Attempted invalid state change in workflow
- `PAYMENT_ALREADY_SUBMITTED`: Bill already in `menunggu_konfirmasi` state
- `ALREADY_REVIEWED`: Fund application already approved/rejected
- `INSUFFICIENT_BALANCE`: Balance check failed (currently not actively used)

### Prisma Error Mapping

- `P2002` (409): Unique constraint violation (duplicate NIM/email)
- `P2025` (404): Record not found

---

## Historical Tradeoffs

### Simplified Architecture

- **No Soft Deletes**: Hard deletion only
- **No Audit Trail**: No change history tracking
- **No Multi-Currency**: IDR only
- **No Notifications**: No email/SMS system
- **No Recurring Bills**: Fixed monthly only
- **No Payment Plans**: Cannot split bills

### Performance vs Consistency

- **Eventual Consistency**: Cache may be stale up to TTL duration
- **Optimistic Locking**: Used only for critical payment confirmations
- **Async Cache Invalidation**: Non-blocking cache clearing

### Feature Limitations

- **No Refunds**: No explicit refund mechanism
- **No Interest**: No interest calculations on balances
- **No Partial Payments**: Binary paid/unpaid model

---

## Cache Key Patterns

Invalidating the wrong pattern can cause stale data:

```
user:${userId}*              - User profile data
transactions:${classId}*     - Transaction lists
balance:${classId}           - Financial summaries
cash-bills:${userId}*        - User's bill data
dashboard:${userId}*         - Dashboard aggregations
bendahara-dashboard:all*     - Treasurer dashboard
rekap-kas:all*               - Financial reports
chart-data*                  - Chart aggregations
breakdown*                   - Category breakdowns
```

---

## Database Index Strategy

**Critical for Performance:**

- `User`: indexed by `classId`, `nim`
- `Transaction`: indexed by `classId`, `date`, `type`, `category`
- `CashBill`: composite indexes on `[userId, status, dueDate]`, `[classId, status, dueDate]`, `[month, year]`
- `FundApplication`: indexed by `userId`, `classId`, `status`, `createdAt`

---

## Deployment Considerations

### Environment Variables (Critical for Production)

- `JWT_SECRET` and `JWT_REFRESH_SECRET`: Must be generated securely (`openssl rand -base64 64`)
- `CRON_SECRET_KEY`: Required for Cloud Scheduler authentication
- `KAS_KELAS_AMOUNT`: Monthly bill amount (default: 15000)
- `BILL_GENERATION_SCHEDULE`: Cron expression (default: `0 0 1 * *`)
- `GCP_PROJECT_ID` and `GCP_BUCKET_NAME`: Required for file uploads

### Database Migration Notes

- Prisma v7 with `prisma-client` provider (not `prisma-client-js`)
- Custom output path: `src/prisma/generated`
- Uses `@prisma/adapter-pg` for PostgreSQL

---

## Assumption Notes

**Marked as Assumption:**

- Single treasurer per class assumption may need revisiting if batch has multiple treasurers
- Holiday months (Jan, Feb, Jul, Aug) are hardcoded based on Indonesian academic calendar
- Cross-class transparency is a product decision; `classId` filtering could be enabled in future
- No notification system assumes manual checking by users
- Currency is assumed IDR throughout; no currency conversion logic exists
