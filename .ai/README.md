# Agent Memory Manifest

This directory stores durable, source-grounded memory for the GalaCash server.
Knowledge is separated by type to reduce stale or contradictory guidance.

## Files

| File | Memory type | Read when |
| --- | --- | --- |
| `.ai/AGENTS.md` | operating policy | starting implementation, diagnosis, or review |
| `.ai/CONTEXT.md` | semantic facts and relationships | understanding domain, architecture, contract, state, or blast radius |
| `.ai/DECISIONS.md` | rationale, constraints, known mismatches | changing architecture or resolving conflicting guidance |
| `.ai/SKILLS.md` | procedural playbooks | carrying out a recurring task |

The repository-root `AGENTS.md` is the discovery hook for this memory.

## Memory rules

- Current executable source and Prisma schema outrank memory.
- `openapi.yaml` is authoritative for the published contract, but route/source
  mismatches must be reported and reconciled.
- Facts require repository-relative evidence.
- Decisions include status and consequences.
- Procedures belong only in `.ai/SKILLS.md`.
- Session history, issue status, test totals, and temporary plans are episodic
  information and do not belong here.
- Never store secrets, token values, credentials, or personal data.
- Keep memory project-independent: every cited file/folder must exist in this
  repository. Describe integrations through local contracts and boundaries.
- Mark uncertainty as `Open question`; never promote inference to fact.

## Retrieval guide

| Task | Load |
| --- | --- |
| isolated controller/repository change | `.ai/AGENTS.md` plus relevant `.ai/CONTEXT.md` section |
| endpoint/contract change | `AGENTS.md`, API sections, endpoint playbook |
| auth/role/ownership | all four files |
| bill/application/transaction | all four files |
| cache/Redis/concurrency | cache sections, `.ai/DECISIONS.md`, relevant playbooks |
| schema/migration | persistence sections, decisions, Prisma playbook |
| upload/job/deployment | relevant context and playbook |

## Source priority

```text
current code/config/Prisma schema
  > openapi.yaml for public contract
  > tests
  > .ai semantic memory
  > README and historical notes
```

Repair stale memory in the same change that exposes it.
