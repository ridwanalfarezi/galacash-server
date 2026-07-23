# Task Playbooks

These are safe procedures. Reconfirm them against current source before use.

## Trace an endpoint

1. Find the operation in `openapi.yaml`.
2. Find the module mount in `src/routes/index.ts`.
3. Read route middleware in execution order.
4. Trace controller input/output adaptation.
5. Trace service ownership, state, and transaction logic.
6. Trace repository/Prisma query and schema constraints.
7. Trace cache reads and every invalidation.
8. Check `openapi.yaml` and local integration tests.

## Add or change an endpoint

1. Define/update Joi schemas with established localized messages.
2. Compose authentication, role, validation, rate-limit, and upload middleware
   in the route.
3. Adapt HTTP concerns in an `asyncHandler` controller.
4. Put business/ownership rules in the service.
5. Add reusable data access to a repository; keep transaction-scoped
   multi-entity work in the owning service.
6. Invalidate all affected caches after a successful commit.
7. Update `openapi.yaml`.
8. Add integration tests for happy path, validation, unauthenticated,
   unauthorized, ownership, and conflict/state cases.
9. Run `bun run test:contract` to prove exact route/OpenAPI parity.

## Implement a multi-step financial write

1. List all rows that must change as one business event.
2. Use `prisma.$transaction` for those writes.
3. Re-read current state inside the transaction.
4. Use expected-state conditions (`updateMany` + count check) when concurrent
   reviewers can race.
5. Preserve Decimal values inside persistence operations.
6. Create derived transaction rows inside the same transaction.
7. Invalidate all dependent caches only after commit.
8. Log identifiers and action, but not secrets or sensitive payloads.
9. Test rollback and duplicate/concurrent attempts.

## Change the cash-bill state machine

1. Read the state graph in `.ai/CONTEXT.md`.
2. Audit cash-bill routes/controller/service and bendahara confirmation logic.
3. Validate the allowed source state before transition.
4. Preserve ownership for student actions and role checks for treasurer actions.
5. Preserve the Redis lock or replace it with an equally explicit concurrency
   design.
6. Keep confirmation plus income creation atomic.
7. Update cancellation/rejection field clearing.
8. Update cache invalidation, OpenAPI enums, response labels, and tests.

## Change fund-application review

1. Validate application exists and is pending.
2. Keep approval plus expense creation in one transaction.
3. Audit category mapping for every enum value.
4. Require and persist rejection reason where the route schema specifies.
5. Invalidate application, transaction, balance, chart, dashboard, and recap
   projections as applicable.
6. Update OpenAPI, route behavior, and integration tests.

## Change authentication or sessions

1. Read auth route/controller/service, auth middleware, token utilities, cookie
   options, refresh repository, and OpenAPI security definitions.
2. Preserve token lifetimes and error-code semantics unless explicitly changing
   the contract.
3. Keep refresh rotation server-side.
4. Keep cookies httpOnly and production-secure.
5. Review blacklist behavior and `tokenVersion` revocation together.
6. Avoid leaking whether NIM or password was incorrect.
7. Test login, expiry, refresh rotation, replay, logout, revoke-all, Bearer
   fallback, wrong role, and Redis-unavailable behavior.
8. Update OpenAPI and local contract tests when codes, cookies, or responses
   change.

## Add a Prisma schema change

1. Edit `prisma/schema.prisma`.
2. Decide data migration and rollback/compatibility behavior.
3. Create a migration with `bun run prisma:migrate`.
4. Regenerate with `bun run prisma:generate`.
5. Never hand-edit `src/prisma/generated`.
6. Update repositories/services, validators, OpenAPI, and seed/test helpers.
7. Check Decimal conversion, indexes, uniqueness, and delete behavior.
8. Run type-check and affected integration tests.

## Add or change a cache

1. Define the full key dimensions; include every filter affecting the result.
2. Choose TTL according to data volatility.
3. List all mutations that can change the cached projection.
4. Add broad invalidation or a versioned epoch as appropriate.
5. Decide whether Redis-unavailable behavior may degrade to the database.
6. If correctness needs exclusivity, use a lock and document fail-closed
   behavior separately from ordinary cache fallback.
7. Add cache hit/miss, invalidation, and unavailable-Redis tests.

## Add a distributed lock

1. Use a resource-specific key and bounded TTL.
2. Acquire before reading the state protected from races.
3. Treat acquisition failure as a business conflict/retry signal.
4. Release in `finally` with the returned fencing token.
5. Do not replace compare-and-delete release with plain `DEL`.
6. Test contention, stale TTL, operation failure, and Redis unavailability.

## Add or change an upload

1. Configure Multer memory handling and route rate limits.
2. Keep maximum size explicit.
3. Validate extension, declared MIME, and magic bytes.
4. Add signatures if supporting a new format.
5. Decide required versus optional storage behavior.
6. Store only the resulting URL and safe metadata.
7. Update OpenAPI multipart schemas and route validation rules.
8. Test spoofed MIME/extension, short buffers, oversize files, unavailable GCS,
   and success.

## Change bill generation

1. Read local startup, cron route authentication, job, schema uniqueness, and
   Redis lock.
2. Preserve month-scoped idempotency.
3. Keep semester-break months aligned with documented job behavior and tests.
4. Preserve batch/cursor processing for large user sets.
5. Update environment examples and deployment scheduler config.
6. Test duplicate delivery, Redis unavailability, break months, partial batch
   failure, and existing bills.

## Debug stale financial data

1. Name the stale projection and exact cache key.
2. Confirm whether it is versioned by financial epoch.
3. Find the mutation and verify invalidation happens after commit.
4. Check wildcard coverage for global and class-specific keys.
5. Confirm Redis SCAN/delete completed.
6. Verify the API response after invalidation before adding cache workarounds.
7. Add a regression test before narrowing/broadening cache policy.

## Verification matrix

| Change                            | Minimum checks                                                              |
| --------------------------------- | --------------------------------------------------------------------------- |
| docs/memory only                  | links, `git diff --check`                                                   |
| utility/repository                | `bun run type-check`, focused unit/integration test                         |
| endpoint/service                  | type-check, lint, affected integration tests                                |
| auth/financial/concurrency/schema | full relevant local suite and OpenAPI review                                |
| OpenAPI contract                  | `bun run test:contract`, regenerate consumer types, test affected endpoints |

Use `bun run test:unit` for isolated tests, `bun run test:integration` for
PostgreSQL/Redis-backed behavior, `bun run test:contract` for route parity, and
`bun run type-check:tests` to compile the test sources.

For a fresh local integration environment, run
`bun run test:integration:docker`. It waits for the isolated Compose services,
applies committed migrations using `.env.test`, and then runs the integration
suite. Use `bun run test:down` when the temporary services are no longer
needed.
