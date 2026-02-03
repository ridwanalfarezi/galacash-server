# GalaCash Development Skills

Procedural skills for working with the GalaCash financial management system.

---

## Skill: Add New API Endpoint

1. Define Joi validation schema in `src/validators/schemas.ts` with Indonesian error messages
2. Add route handler in `src/routes/[module].routes.ts` using existing route pattern
3. Implement controller function in `src/controllers/[module].controller.ts` wrapped with `asyncHandler`
4. Add business logic in `src/services/[module].service.ts` following service class pattern with repository injection
5. If new data access needed, add method to `src/repositories/[module].repository.ts`
6. Invalidate relevant cache patterns after mutations using `CacheService.invalidate[Pattern]`
7. Add integration test in `tests/integration/[module].test.ts` using `resetDb()` and supertest
8. Update OpenAPI spec in `openapi.yaml` with new endpoint documentation

---

## Skill: Implement Financial Transaction

1. Verify caller has `bendahara` role using `requireRole(["bendahara"])`
2. Use Prisma `$transaction` for atomic operations affecting multiple tables
3. Convert Decimal to Number before returning API response: `Number(amount)`
4. Update related balance aggregations using `prisma.transaction.aggregate` with `_sum`
5. Invalidate cache keys: `transactions:${classId}*`, `balance:${classId}`, `bendahara-dashboard:all*`
6. Log operation with `logger.info()` including user context and amounts
7. Handle Prisma errors: map `P2002` to 409, `P2025` to 404

---

## Skill: Modify Bill State Machine

1. Review current state transitions in CONTEXT.md Bill State Machine section
2. Locate bill status update in `src/services/cash-bill.service.ts` or `src/services/bendahara.service.ts`
3. Add state validation before transition:
   ```typescript
   if (bill.status !== "current_status") {
     throw new BusinessLogicError("INVALID_STATUS_TRANSITION");
   }
   ```
4. For payment confirmations, use `updateMany` with WHERE clause for optimistic locking
5. Verify `updateResult.count > 0` to detect race conditions
6. Auto-create related transaction records when transitioning to `sudah_dibayar`
7. Invalidate cache: `cash-bills:${userId}*`, `bendahara-dashboard:all*`
8. Update test cases in `tests/integration/bills.test.ts` and `tests/integration/bill-payment.test.ts`

---

## Skill: Add Database Schema Change

1. Modify `prisma/schema.prisma` with new fields/relations/indexes
2. Run `bun run prisma:migrate` to generate migration
3. Run `bun run prisma:generate` to regenerate client to `src/prisma/generated`
4. Update affected repository methods in `src/repositories/[module].repository.ts`
5. Update TypeScript interfaces if manual types exist (prefer generated types)
6. Update Joi validation schemas if new fields are user-input
7. If adding enum values, check all switch statements and category mappings
8. Test with `bun test` to verify no breaking changes

---

## Skill: Debug Cache Issue

1. Identify cache key pattern from `src/services/cache.service.ts` method definitions
2. Check Redis connectivity: review `src/config/redis.config.ts` for graceful degradation logic
3. Add cache hit/miss logging in service method before database query
4. Verify cache invalidation is called after mutations using pattern from CONTEXT.md
5. Check TTL alignment with volatility: user data (3600s), transactions (300s), dashboard (60s)
6. Manually inspect cache using Redis CLI: `SCAN 0 MATCH pattern:* COUNT 100`
7. Clear specific pattern if stale data suspected: `DEL user:${userId}` or pattern invalidation

---

## Skill: Extend Authentication Flow

1. Add validation schema in `src/validators/schemas.ts` with NIM pattern `^13136[0-9]{5}$` if needed
2. Implement service method in `src/services/auth.service.ts` using `Bun.password.hash/verify`
3. Generate tokens using `generateAccessToken()` and `generateRefreshToken()` from `src/utils/generate-tokens.ts`
4. Store refresh token via `refreshTokenRepository` with expiration
5. Set cookies using `getCookieOptions()` from `src/utils/cookie-options.ts`
6. Add controller endpoint in `src/controllers/auth.controller.ts` wrapped with `asyncHandler`
7. Update route in `src/routes/auth.routes.ts` with appropriate rate limiting
8. Apply `authenticate` middleware to protected routes needing the new flow

---

## Skill: Add Repository Method

1. Open `src/repositories/[module].repository.ts`
2. Define method signature returning Promise with specific Prisma model or array
3. Use Prisma's fluent API: `prisma.[model].findUnique`, `findMany`, `create`, `update`, `delete`
4. Add `include` clauses for related data when needed
5. Add transaction support using `prisma.$transaction([...])` for multi-table operations
6. Return raw Prisma results without transformation (service layer handles that)
7. Export from `src/repositories/index.ts` if new repository created

---

## Skill: Implement File Upload Endpoint

1. Define upload route in `src/routes/[module].routes.ts` with `uploadMiddleware`
2. Configure limits in `src/config/multer.config.ts`: 10MB general, 5MB avatars
3. Validate file type: JPEG, PNG, WebP, PDF only
4. Use `storage.config.ts` for GCP upload logic
5. Store returned URL in database field
6. Return URL in API response
7. Add upload-specific rate limit (50 requests per 15 min window)

---

## Skill: Fix Integration Test Failure

1. Run specific test: `bun test tests/integration/[name].test.ts`
2. If database-related, verify `resetDb()` is called in `beforeEach`
3. Check test environment variables are loaded (automatic via Bun)
4. Verify mock modules in `tests/setup.ts` for external dependencies (Redis, rate-limit)
5. Compare test data setup with actual schema (NIM format, required fields)
6. Check for cookie handling in supertest requests
7. Review error responses match expected format: `{ success: false, error: { code, message } }`

---

## Skill: Add Role-Based Access Control

1. Import `requireRole` from `src/middlewares/auth.middleware.ts`
2. Apply middleware to route: `router.get("/path", authenticate, requireRole(["bendahara"]), handler)`
3. For ownership checks, add method in service:
   ```typescript
   private checkOwnership(resource: Resource, userId: string): void {
     if (resource.userId !== userId) {
       throw new AuthorizationError("This resource does not belong to you");
     }
   }
   ```
4. Verify `req.user` is populated by `authenticate` middleware before access
5. Test with both authorized and unauthorized users in integration tests

---

## Skill: Implement Cron Job Handler

1. Add route in `src/routes/cron.routes.ts` with secret key verification
2. Verify `X-CloudScheduler-Key` header against `CRON_SECRET_KEY` env var
3. Check `User-Agent` for `Google-Cloud-Scheduler` string
4. Allow development bypass when `NODE_ENV=development`
5. Implement job logic in `src/jobs/[name].job.ts` following bill-generator pattern
6. Handle duplicate prevention using unique database constraints
7. Log all executions with `logger.info()` including timestamp and results
8. Return 200 with summary even if no work performed

---

## Skill: Create Fund Application Workflow

1. Student creates application via `fundApplicationService.create()` with category validation
2. Store attachment URL if provided during creation
3. Bendahara reviews via `bendaharaService.reviewFundApplication()`
4. Verify application status is `pending` before review (throw `ALREADY_REVIEWED` if not)
5. If approving:
   - Map FundCategory to TransactionCategory using switch statement
   - Create expense transaction via `prisma.transaction.create()` within same transaction
   - Update application status to `approved`
6. If rejecting:
   - Require rejectionReason in request body
   - Update application status to `rejected`
7. Invalidate cache: `fund-application*`, `bendahara-dashboard:all*`
8. Log review action with reviewer ID and decision

---

## Skill: Handle Financial Aggregation Query

1. Use Prisma `aggregate` with `_sum` instead of fetching all rows
2. Run parallel queries via `Promise.all([incomeAgg, expenseAgg])`:
   ```typescript
   const [incomeAgg, expenseAgg] = await Promise.all([
     prisma.transaction.aggregate({ where: { type: "income" }, _sum: { amount: true } }),
     prisma.transaction.aggregate({ where: { type: "expense" }, _sum: { amount: true } }),
   ]);
   ```
3. Convert Decimal to Number: `Number(incomeAgg._sum.amount || 0)`
4. Calculate derived values: `balance = totalIncome - totalExpense`
5. Apply date filters using `date.gte` and `date.lte` for Jakarta timezone
6. Cache results with appropriate TTL (300s for transactions, 60s for dashboard)
7. Return structured response with summary and detailed arrays

---

## Skill: Resolve Merge Conflict in Service

1. Identify if conflict is in repository call, business logic, or cache invalidation
2. For repository conflicts: keep both method calls if both features needed
3. For business logic: ensure state machine transitions remain valid per CONTEXT.md
4. For cache invalidation: combine both patterns using `invalidateCache()` calls
5. Verify no duplicate error code definitions
6. Run `bun run type-check` to verify TypeScript compilation
7. Run `bun test` to verify no logic regression
8. Run `bun run lint` to ensure code style compliance
