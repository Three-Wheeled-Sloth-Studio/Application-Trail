# Next Development Prompt

Continue implementation in:

`https://github.com/Three-Wheeled-Sloth-Studio/Application-Trail`

Work from the current `main` branch.

Read these first:

1. `AGENTS.md`
2. `refs/README.md`
3. `refs/project.yaml`
4. `refs/product/product-requirements.md`
5. `refs/architecture/system-architecture.md`
6. `refs/architecture/domain-model.md`
7. `refs/architecture/security-and-secrets.md`
8. `refs/architecture/review-room-ai-reference.md`
9. `refs/planning/mvp-roadmap.md`
10. `refs/handoffs/currentHandoff.md`

## Immediate objective

Implement WP0: the smallest executable repository scaffold that supports a thin end-to-end capture slice.

Prefer a TypeScript npm-workspace monorepo unless implementation evidence shows a better fit.

Initial expected surfaces:

- `apps/extension`
- `apps/web`
- `apps/api`
- `packages/domain`

Do not create every future package yet. In particular, defer `apps/local-bridge` until local AI/BYOK work needs it.

## WP0 requirements

Establish:

- root workspace/package configuration
- TypeScript baseline
- formatting/linting only as useful, not ceremony
- unit-test baseline
- CI validation
- ignored local env files with safe examples
- buildable Manifest V3 extension shell
- buildable/runnable web shell
- buildable/runnable API shell
- first domain types for Company, Opportunity, ListingObservation, ListingSnapshot, Application, ApplicationEvent, and ResumeArtifact

Keep the initial UI minimal. The purpose of WP0 is executable seams, not visual design.

## Architectural constraints

- Preserve the Opportunity vs Listing Observation distinction.
- Source evidence must be preserved separately from derived/normalized fields.
- User-owned canonical records need a user ownership boundary from the start.
- Do not put PostgreSQL credentials or service secrets in extension code.
- Do not make browser storage canonical.
- Do not implement custom password auth.
- Do not silently merge duplicate/repost candidates.
- Keep AI provider concerns out of the first scaffold unless needed for build seams.
- Keep the public repo free of real user data, resumes, job descriptions, or credentials.

## After WP0

If WP0 is green and there is enough room in the development slice, begin WP1 only far enough to create the first persistent Opportunity + Listing Observation + Listing Snapshot round trip.

The desired first serious vertical slice is:

`real browser page -> extension capture -> API -> PostgreSQL -> retrieve in web app`

Google OAuth can be integrated as WP3 if it would slow the first local vertical slice substantially, but the API/data model should not create a throwaway identity design.

## Reference reuse

For later AI work, inspect `Three-Wheeled-Sloth-Studio/Review-Room`, especially its Ollama/provider and popup-to-tab patterns. Do not copy durable credential handling as-is; Application Trail intends to improve that boundary.

## Validation and handoff

Run all validation available after scaffolding. Record exact commands and results. Update:

- `refs/handoffs/currentHandoff.md`
- this file if the next objective changes

Prefer a working narrow slice over additional speculative architecture documents.
