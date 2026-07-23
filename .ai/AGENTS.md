# Agent Operating Contract

Applies to work on the GalaCash Express API.

## Mission

Maintain a secure and auditable financial API for students (`user`) and
treasurers (`bendahara`). Prioritize authorization, financial integrity,
atomicity, contract stability, and operationally safe behavior.

## Start-of-task protocol

1. Read `README.md` in this directory and load the relevant memory.
2. Inspect the current source, schema, OpenAPI operation, and tests before
   trusting remembered behavior.
3. Map caller -> route middleware -> controller -> service -> repository/Prisma
   -> cache invalidation -> response.
4. For writes, identify race conditions and every derived cache.
5. Check the working tree and preserve unrelated user changes.
6. Record uncertainty as an open question, never as an invented fact.

## Layer responsibilities

| Layer | Responsibility | Boundary |
| --- | --- | --- |
| routes | endpoint composition, auth/role/upload/validation/rate-limit middleware | no business rules |
| controllers | HTTP input/output adaptation | no reusable business logic |
| services | business rules, ownership, state transitions, atomic workflows, cache coordination | may use transaction-scoped Prisma for atomic work |
| repositories | reusable persistence queries and pagination | no HTTP behavior |
| Prisma | schema, constraints, indexes, transaction client | generated client is never hand-edited |
| utilities/middleware | cross-cutting errors, auth, validation, logging, upload security | fail closed for security decisions |

The older absolute rule "all database access goes through repositories" is not
true of the current design. Preserve service-level Prisma use where an
interactive transaction must atomically update multiple entities, or where a
service owns a specialized aggregation. Do not spread direct access casually.

## Invariants

- External responses follow the success/error envelope used by response helpers
  and the global error handler.
- Authenticated identity comes from verified access-token claims on `req.user`.
- Route role middleware is the primary role gate; ownership checks still belong
  in services.
- Password hashing/verification uses `Bun.password`.
- Refresh tokens rotate and are stored server-side.
- Bill confirmation and fund approval create their corresponding transaction
  in the same database transaction.
- A state-changing financial operation invalidates all dependent aggregate and
  list caches after the database commit.
- Prisma `Decimal` values must be deliberately converted at API/report
  boundaries where the contract expects numbers.
- Raw SQL uses mapped PostgreSQL table names such as `"transactions"`.
- Upload validation trusts magic bytes as the authoritative file-type gate.
- User-facing messages remain Indonesian where established; internal code and
  documentation use English.

## High-risk areas

Audit end to end before changing:

- `prisma/schema.prisma` and migrations
- `src/middlewares/auth.middleware.ts`
- `src/services/auth.service.ts`
- `src/utils/generate-tokens.ts`
- `src/utils/cookie-options.ts`
- `src/services/bendahara.service.ts`
- `src/services/cash-bill.service.ts`
- `src/services/cache.service.ts`
- `src/config/redis.config.ts`
- `src/jobs/bill-generator.job.ts`
- `src/middlewares/upload.middleware.ts`
- `openapi.yaml`

## Operational rules

- Use Winston logger, not `console.log`.
- Keep Redis credentials out of logs.
- Cache reads/writes may degrade to misses/no-ops when Redis is unavailable.
- Distributed lock operations do not degrade: current acquisition returns
  failure without Redis. Preserve or explicitly redesign that correctness
  choice.
- Start serving health checks before noncritical background initialization.
- Preserve graceful shutdown for HTTP, Redis, and Prisma.
- Ask before adding a runtime dependency or changing package-manager policy.

## Completion protocol

- Run checks proportional to risk.
- Re-read the diff for auth, ownership, money, dates, state transitions,
  transaction boundaries, cache invalidation, and response compatibility.
- Update `.ai/CONTEXT.md` for changed stable facts/relationships.
- Update `.ai/DECISIONS.md` for changed architectural rationale or resolved
  mismatches.
- Update `.ai/SKILLS.md` when the safe procedure changes.
