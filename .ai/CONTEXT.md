# Semantic Memory: GalaCash Server

Verified on 2026-07-23 against the current working tree. This file stores
durable, source-grounded facts and relationships, not task history.

## Retrieval index

| Concept               | Aliases                                              | Primary evidence                                     |
| --------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| authentication        | auth, JWT, cookie, refresh, token version, blacklist | auth middleware/service/controller, token utilities  |
| authorization         | role, ownership, user, bendahara, treasurer          | route middleware and service ownership checks        |
| financial transaction | income, expense, balance, chart, breakdown           | transaction service/repository, bendahara service    |
| cash bill             | tagihan, payment, confirmation, bill state           | cash-bill and bendahara services                     |
| fund application      | aju dana, approval, rejection                        | fund-application and bendahara services              |
| cache                 | Redis, TTL, invalidation, epoch, stampede            | Redis config, cache service, business services       |
| concurrency           | lock, race, optimistic locking, idempotency          | Redis config, cash-bill/bendahara services, bill job |
| persistence           | Prisma, PostgreSQL, schema, migration, Decimal       | `prisma/schema.prisma`, repositories, Prisma utility |
| upload                | GCS, proof, avatar, attachment, magic bytes          | upload middleware, multer/storage config             |
| API contract          | OpenAPI, envelope, endpoint, validation              | routes, controllers, response/errors, `openapi.yaml` |
| scheduling            | cron, Cloud Scheduler, bill generation               | bill job, cron routes, `src/index.ts`                |

## System identity

GalaCash Server is an Express 5 TypeScript API, run through Bun scripts, backed
by PostgreSQL via Prisma 7 and optionally connected to Redis and Google Cloud
Storage. It exposes `/api/*`, Swagger UI at `/api/docs`, and `/health`.

Evidence: `package.json`, `src/app.ts`, `src/index.ts`,
`prisma/schema.prisma`.

## Concept graph

```text
HTTP request
  -> route middleware
     -> rate limit
     -> authentication
     -> role authorization
     -> Joi validation
     -> upload validation/storage when applicable
  -> controller
  -> service
     -> ownership/business-state check
     -> repository OR transaction-scoped Prisma
     -> cache invalidation after commit
  -> response helper / global error handler

CashBill confirmation
  -> CashBill(sudah_dibayar)
  -> Transaction(income, kas_kelas)

FundApplication approval
  -> FundApplication(approved)
  -> Transaction(expense, mapped category)

Prisma schema
  -> generated client in src/prisma/generated
  -> repositories/services
  -> OpenAPI response contract
  -> external API consumers
```

## Layered architecture

The dominant flow is controller -> service -> repository -> Prisma. Two
intentional exceptions exist in current source:

- service-level interactive Prisma transactions for atomic multi-entity
  workflows;
- service-level aggregate/specialized queries in bendahara/auth/job code.

Controllers should not access Prisma. New reusable query behavior should
normally enter a repository. Transaction-scoped reads/writes may remain in the
service that owns the atomic business event.

Evidence: `src/controllers/**`, `src/services/**`, `src/repositories/**`.

## Persistence model

### Class

Owns users, transactions, fund applications, and cash bills.

### User

Has unique NIM, optional unique email, `user | bendahara` role, class relation,
avatar, password hash, and `tokenVersion` for broad session revocation.

### RefreshToken

Stores a unique signed refresh token, owner, and expiry. Refresh rotates by
deleting the old row and creating a new one.

### Transaction

Class-scoped `income | expense` record with Decimal amount, category,
description, date, and optional attachment. Aggregate views intentionally span
all classes unless a particular service supplies `classId`.

### FundApplication

Belongs to a user and class; has `pending | approved | rejected`, category,
Decimal amount, optional attachment/rejection reason, and optional reviewer.

### CashBill

Belongs to a student and class; unique by `(userId, month, year)` and also has a
unique external `billId`. Holds amount components, payment evidence/account,
status, and confirmer metadata.

### PaymentAccount

An active/inactive bank or e-wallet destination. Cash bills can retain a
nullable reference; deletion uses `SetNull`.

Evidence: `prisma/schema.prisma`.

## Role and visibility semantics

- `authenticate` accepts `accessToken` cookie first, then Bearer token.
- `requireBendahara` allows only `bendahara`.
- `requireUser` currently allows both `user` and `bendahara`.
- Bendahara routes are explicitly protected by both authentication and
  `requireBendahara`.
- Personal bill/application methods enforce ownership.
- Many transactions, charts, balance, students, and bendahara lists support
  cross-class transparency by design.
- Class scoping is endpoint-specific. Never infer it only from the caller's
  token `classId`.

Evidence: auth middleware, route modules, transaction/bendahara services.

## Authentication lifecycle

### Login

1. Validate NIM/password input.
2. Load user by NIM and verify with `Bun.password`.
3. Cache current `tokenVersion`.
4. Generate a one-hour access token and seven-day refresh token.
5. Store refresh token in PostgreSQL.
6. Set httpOnly cookies and return user data, not tokens.

### Authenticated request

1. Read cookie or Bearer token.
2. Reject a Redis-blacklisted token.
3. Verify JWT signature/expiry.
4. Compare token version with cached active version when available.
5. Attach claims to `req.user`.

### Refresh

1. Read refresh cookie.
2. Verify signature and stored token row.
3. Delete old token.
4. create and store a new refresh token;
5. set both cookies again.

### Logout/revoke

Logout deletes the presented refresh token, blacklists the presented access
token for its remaining lifetime, and clears cookies. `revokeAllSessions`
deletes all refresh tokens for the user and increments `tokenVersion`.

Cookies are httpOnly, secure in production, `sameSite=lax` by default, and use
path `/`.

Evidence: auth route/controller/service, auth middleware, token and cookie
utilities.

## Financial state machines

### Cash bill

```text
belum_dibayar
  --student submits payment, Redis bill lock--> menunggu_konfirmasi

menunggu_konfirmasi
  --bendahara confirms, DB transaction + optimistic update-->
  sudah_dibayar + income(kas_kelas) transaction

menunggu_konfirmasi
  --student cancels or bendahara rejects--> belum_dibayar
```

Confirmation uses `updateMany` with the expected old status and checks
`count > 0` to catch a race. The generated income transaction uses the bill's
class and total amount.

Single-bill submissions require payment proof. Batch cash submissions may omit
proof, while non-cash batch submissions are rejected without proof.

### Fund application

```text
pending
  --bendahara approves in DB transaction-->
  approved + mapped expense transaction

pending
  --bendahara rejects--> rejected + rejection reason
```

Only pending applications can be reviewed.

Evidence: cash-bill service and bendahara service.

## Financial visibility and precision

- Public transaction list, chart, breakdown, and default balance behavior are
  cross-class.
- Bendahara dashboard and recap can accept class filters; absent filters can
  represent global views.
- Amounts are Prisma Decimal in storage.
- Aggregates use database `_sum` or SQL `SUM` rather than loading all rows.
- Raw SQL chart/breakdown queries use the mapped `"transactions"` table.
- API/report layers explicitly convert Decimal aggregates to numbers.
- Currency is IDR; no conversion entity exists.

Evidence: transaction repository/service, bendahara service,
`prisma/schema.prisma`.

## Cache and concurrency model

### Degradable cache operations

Safe Redis get/set/delete/exists/incr helpers return cache-miss/no-op style
fallbacks when Redis is unavailable. Standard cached reads can continue from
PostgreSQL.

### Correctness locks

`acquireLock()` fails closed when Redis is unavailable. This affects bill
payment submission, stampede protection that uses the lock, and monthly bill
generation. Do not describe all Redis behavior as optional without this
qualification.

Locks use UUID fencing tokens and Lua compare-and-delete release. The
injectable lock algorithm lives in `src/utils/redis-lock.ts`; Redis config
adapts the production client to it so the algorithm can be tested without a
network service.

### Key families

- `user:*`, `user:nim:*`, `user:token_version:*`
- `token:blacklist:*`
- `transactions:*`, `balance:*`
- `epoch:finance:*`
- `fund-application*`, `my-applications:*`
- `cash-bill*`, `my-bills:*`
- `dashboard:*`, `bendahara-dashboard:*`
- `chart-data*`, `breakdown*`, `rekap-kas*`, `all-students*`
- `lock:*`

Financial mutations use broad invalidation and/or a financial epoch after the
database commit. Adding a cached projection requires adding its mutation
invalidation paths.

Evidence: Redis config, cache service, business services.

## API surface by module

- `/api/auth`: login, refresh, logout
- `/api/users`: profile, password, avatar, classmates
- `/api/dashboard`: summary and pending counts
- `/api/transactions`: lists, charts, breakdown, balance/export/detail
- `/api/fund-applications`: global/personal reads and creation
- `/api/cash-bills`: personal reads, single/batch payment, cancellation
- `/api/payment-accounts`: public active list; bendahara management
- `/api/labels`: public label dictionaries
- `/api/bendahara`: dashboard, reviews, confirmations, recap, students,
  transaction creation/export
- `/api/cron`: authenticated scheduler bill generation plus a public health
  endpoint

The route modules and `openapi.yaml` are authoritative for exact methods,
parameters, and envelopes.

## Validation, errors, and uploads

- Joi schemas validate request body/query data at route boundaries.
- Async controllers use `asyncHandler`; the global handler serializes
  `AppError` descendants and hides production stacks.
- Uploads use in-memory file buffers and accept JPEG, PNG, WebP, or PDF up to
  10 MB in the shared upload middleware.
- Extension and declared MIME checks fail fast; magic-byte signatures are the
  authoritative content check.
- GCS upload attaches a URL to `req.fileUrl`. Required uploads fail outside
  tests when storage is unavailable. Optional uploads can continue without a
  URL. Tests use deterministic `mock://test-uploads/...` URLs when storage is
  deliberately unavailable.

Evidence: validators, error utilities, multer/storage config, upload middleware.

## Bill generation

- Schedule defaults to `0 0 1 * *`.
- Local cron runs only when `USE_LOCAL_CRON=true`; production guidance is Cloud
  Scheduler calling `/api/cron/generate-bills`.
- Amount defaults to `KAS_KELAS_AMOUNT` or 10000; admin fee is currently zero.
- January, February, July, and August are semester breaks and generate no bills.
- Users are processed in batches of 100.
- Database uniqueness and a month-scoped Redis lock provide duplicate
  protection.

Evidence: `src/index.ts`, `src/jobs/bill-generator.job.ts`,
`src/routes/cron.routes.ts`, Prisma unique constraint.

## Published contract consistency

`openapi.yaml` is this repository's published API contract. Any external
endpoint or schema change must update it in the same change. Coordinate source,
validation, examples, response envelopes, and error codes locally so API
consumers receive one consistent contract. `tests/contract/openapi-routes.test.ts`
extracts executable router declarations and enforces exact HTTP method/path
parity with the specification.

## Change impact map

| If this changes           | Also inspect                                                                      |
| ------------------------- | --------------------------------------------------------------------------------- |
| Prisma model/enum/index   | migration, generated client, repositories/services, OpenAPI                       |
| auth token/error code     | middleware, controller/service, cookies, OpenAPI, auth tests                      |
| bill/application state    | validators, services, transaction creation, cache invalidation, OpenAPI           |
| cache key/invalidation    | all readers and every related mutation; stress tests                              |
| cross-class scope         | repository filters, token classId assumptions, dashboards/exports, product intent |
| upload limits/types       | multer, magic signatures, OpenAPI, route schemas, tests                           |
| response envelope         | global error handler, controllers, OpenAPI, integration tests                     |
| bill schedule/month rules | job, cron endpoint, environment example, job tests                                |

## Freshness protocol

Update stable facts here only after verifying code/config/tests. Put rationale
and contradictions in `.ai/DECISIONS.md`; procedures in `.ai/SKILLS.md`.
Refresh the verified commit/date only after a complete memory audit.
