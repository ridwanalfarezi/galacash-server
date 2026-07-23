# Architecture Decisions and Known Mismatches

Status values are `accepted`, `provisional`, or `open`.

## D-001: Layered architecture with transaction exceptions

- Status: accepted
- Decision: controllers adapt HTTP, services own business workflows,
  repositories own reusable persistence. Services may use Prisma directly for
  interactive transactions and specialized aggregates.
- Evidence: controllers/services/repositories and bendahara service.
- Consequence: the old absolute ban on service-level Prisma access is obsolete;
  new direct access still needs a clear atomicity/ownership reason.

## D-002: Prisma v7 generated client location

- Status: accepted
- Decision: generate the client to `src/prisma/generated`.
- Evidence: `prisma/schema.prisma`.
- Consequence: never edit generated files or create a second generated-client
  location.

## D-003: Cookie JWT plus stored rotating refresh token

- Status: accepted
- Decision: short-lived access JWT, stored/rotating refresh JWT, httpOnly
  cookies, blacklist on logout, and token-version revocation.
- Evidence: auth controller/service/middleware and token utilities.
- Consequence: authentication changes require coordinated routes, middleware,
  OpenAPI, cookies, and local security tests.

## D-004: Redis has two different availability contracts

- Status: accepted
- Decision: ordinary cache operations degrade safely, while distributed locks
  fail closed.
- Evidence: `src/config/redis.config.ts`.
- Consequence: saying "Redis is optional" is incomplete. Some write/job
  workflows cannot proceed without a lock.

## D-005: Atomic derived financial transactions

- Status: accepted
- Decision: approving a fund application atomically creates an expense;
  confirming a bill atomically creates income.
- Evidence: `src/services/bendahara.service.ts`.
- Consequence: splitting these actions or creating transactions asynchronously
  can corrupt financial truth.

## D-006: Cross-class transparency

- Status: accepted
- Decision: several transaction, balance, chart, student, and bendahara views
  span classes by default; personal resources remain scoped.
- Evidence: transaction repository/service and bendahara service.
- Consequence: adding implicit token-class filtering is a product behavior
  change, not a routine security fix.

## D-007: Broad post-commit financial invalidation

- Status: accepted
- Decision: financial mutations broadly clear list and aggregate key families
  and use a financial epoch where implemented.
- Evidence: cache, transaction, bendahara, cash-bill, and fund services.
- Consequence: invalidation belongs after commit and must cover global and
  class-specific projections.

## D-008: Upload content is verified by signature

- Status: accepted
- Decision: magic bytes are authoritative; MIME and extension are preliminary
  filters.
- Evidence: upload middleware.
- Consequence: new file formats require signature logic and spoofing tests, not
  only an allow-list entry.

## D-009: Local cron versus Cloud Scheduler

- Status: accepted
- Decision: local cron is opt-in; production guidance is the authenticated cron
  endpoint.
- Evidence: `src/index.ts`, cron routes, bill job.
- Consequence: scheduler auth, lock, database uniqueness, and job logic form one
  idempotency boundary.

## D-010: OpenAPI is the published API contract

- Status: accepted
- Decision: update `openapi.yaml` whenever an external operation, payload,
  response, error, or authentication contract changes.
- Evidence: `openapi.yaml`, route modules, controllers.
- Consequence: source/spec drift must be fixed in this repository rather than
  delegated to API consumers.

## D-011: Runtime/package-manager signals

- Status: open
- Current state: scripts and application runtime use Bun; `bun.lock` exists,
  while `packageManager` declares pnpm and a `.pnpm-store` exists.
- Consequence: use existing Bun scripts for normal work, but do not rewrite
  lockfiles or package-manager metadata incidentally.
- Open question: which package manager should be canonical for dependency
  installation?

## Known maintenance items

- Some current code/comments mention an `admin` role although the Prisma enum is
  only `user | bendahara`; do not invent admin authorization without a product
  and schema decision.
- Several services use logical-OR defaults for numeric/pagination values. Check
  zero semantics before copying the pattern.
- Source formatting is mixed between quote styles despite Prettier settings;
  keep changes scoped and let project tooling decide.
- `prisma.config.ts` declares a seed command using `tsx`, while `tsx` is not
  listed in `package.json`; the package script directly uses Bun. Treat the
  package script as the verified path until configuration is reconciled.
