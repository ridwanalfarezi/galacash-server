# Contributing to GalaCash Server

Thank you for contributing. Financial integrity, authorization, atomicity, and
contract stability take priority over convenience.

## Setup

Requirements:

- Bun 1.2.14
- Docker with Compose
- Git

```bash
git clone https://github.com/ridwanalfarezi/galacash-server.git
cd galacash-server
bun install
docker compose up -d --wait
```

Create `.env` from `.env.example`, configure local database/Redis URLs and
32-character-or-longer JWT secrets, then run:

```bash
bun run prisma:generate
bun run prisma:deploy
bun run dev
```

Read [AGENTS.md](AGENTS.md) before implementation work. It routes contributors
to the relevant source-grounded guidance in `.ai/`.

## Architecture rules

- Routes compose middleware and contain no business rules.
- Controllers adapt HTTP and use the established response/error envelope.
- Services own business rules, ownership, state transitions, transactions, and
  cache coordination.
- Repositories own reusable persistence queries.
- Direct Prisma in a service requires a clear interactive-transaction or
  specialized-aggregation reason.
- Multi-step financial writes must be atomic and concurrency-safe.
- Cache invalidation happens after commit and covers all dependent projections.
- Authentication, role checks, ownership, and correctness locks fail closed.
- Update `openapi.yaml` whenever the external API contract changes.
- Never edit `src/prisma/generated` manually.

## Authentication and security

- Passwords are hashed and verified with `Bun.password`.
- Access and refresh JWTs are held in httpOnly cookies.
- Refresh tokens rotate and are stored server-side.
- Logout invalidates the presented refresh/access tokens; revoke-all removes
  every refresh token and increments `tokenVersion`.
- Redis cache failure may degrade safely. Redis lock failure may not.
- Upload validation must include magic-byte checks; MIME and extension alone
  are not authoritative.
- Do not expose secrets, tokens, passwords, personal data, stack traces, or
  `.env` contents.

## Tests and verification

Choose checks based on risk:

| Change                                | Minimum verification                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| Documentation only                    | links and `git diff --check`                                 |
| Utility or repository                 | source type-check and focused unit/integration test          |
| Endpoint or service                   | type-checks, lint, affected integration tests, contract test |
| Auth, finance, concurrency, or schema | full relevant unit/integration coverage and OpenAPI review   |
| OpenAPI contract                      | `bun run test:contract` and affected API tests               |

Full verification:

```bash
bun run type-check
bun run type-check:tests
bun run lint
bun run test:unit
bun run test:integration:docker
bun run test:contract
bun run build
```

The Docker-backed integration command starts isolated PostgreSQL and Redis,
deploys committed migrations using `.env.test`, and runs the integration suite.
Stop the services afterward when they are no longer needed:

```bash
bun run test:down
```

## Database changes

1. Edit `prisma/schema.prisma`.
2. Decide how existing data will migrate.
3. Create a named development migration:

   ```bash
   bun run prisma:migrate -- --name describe_the_change
   ```

4. Regenerate the Prisma client:

   ```bash
   bun run prisma:generate
   ```

5. Update services, repositories, validation, OpenAPI, seeds, and tests.
6. Verify a fresh database with `bun run test:integration:docker`.

Never rely on `db push` as a replacement for a committed production migration.

## Workflow

1. Branch from the intended base.
2. Inspect route, middleware, controller, service, persistence, cache, OpenAPI,
   and tests before editing.
3. Implement the smallest complete change.
4. Add happy-path and failure-path coverage, including permission, ownership,
   validation, state conflict, and rollback cases where relevant.
5. Run checks proportional to risk.
6. Review the diff for money, dates, roles, state transitions, transaction
   boundaries, and cache invalidation.
7. Commit using Conventional Commits.

Examples:

```text
feat(bills): support cash batch payments
fix(auth): reject replayed refresh tokens
test(locks): cover compare-and-delete release
docs(api): document payment rejection
```

Use `bun run commit` for the interactive Commitizen workflow.

## Pull requests

A pull request should:

- explain the business rule and API impact;
- identify migrations, OpenAPI changes, cache effects, and security impact;
- include tests for important failure and concurrency cases;
- avoid unrelated formatting and generated-client changes;
- pass CI from a fresh database migration state.

Please keep discussions respectful, specific, and constructive.
