# GalaCash Server Agent Instructions

This repository keeps durable agent memory in `.ai/`.

## Required reading

1. Read `.ai/README.md` to select relevant memory.
2. Read `.ai/CONTEXT.md` before changing authentication, authorization,
   financial workflows, Prisma schema, caching, uploads, jobs, or API contracts.
3. Read `.ai/DECISIONS.md` before changing an architectural boundary.
4. Use `.ai/SKILLS.md` for task-specific checklists.

## Source-of-truth order

When documentation conflicts, use this order:

1. Executable source, Prisma schema, and configuration
2. `openapi.yaml` for the published API contract
3. Tests
4. `.ai/` memory
5. README and historical documents

Update `.ai/` in the same change when a durable architecture fact, invariant,
contract, or safe workflow changes.

All memory evidence must resolve inside this repository. Do not cite or require
files from another project; represent integrations through this repository's
OpenAPI contract, routes, configuration, and tests.

## Non-negotiable working rules

- Keep TypeScript strict and use the generated Prisma client in
  `src/prisma/generated`.
- Controllers handle HTTP; services handle business workflows; repositories
  handle reusable data access. Direct Prisma in services is allowed only where
  the existing design needs atomic multi-entity work or aggregation.
- Multi-step financial writes must be atomic and concurrency-safe.
- Authentication and authorization fail closed.
- Preserve the response/error envelope and stable error codes.
- Update `openapi.yaml` whenever the external API contract changes.
- Treat Redis cache operations as degradable, but treat Redis-backed locks as
  correctness gates: lock acquisition currently fails closed without Redis.
- Never expose passwords, tokens, secrets, stack traces, or `.env` contents.
- Do not edit generated Prisma files manually.

## Verification

Use the narrowest relevant checks, then expand with risk:

```text
bun run type-check
bun run lint
bun test
```

Integration tests require their configured PostgreSQL/Redis test services.
