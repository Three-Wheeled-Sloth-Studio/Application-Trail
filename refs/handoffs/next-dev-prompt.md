# Next Development Prompt

Continue implementation in:

`https://github.com/Three-Wheeled-Sloth-Studio/Application-Trail`

Work from the current `main` branch.

Read these first:

1. `AGENTS.md`
2. `refs/project.yaml`
3. `refs/product/product-requirements.md`
4. `refs/architecture/system-architecture.md`
5. `refs/architecture/domain-model.md`
6. `refs/architecture/security-and-secrets.md`
7. `refs/planning/mvp-roadmap.md`
8. `refs/handoffs/currentHandoff.md`

## Accepted implementation baseline

- WP0: `0dd20762cd484fd6d45f5c57360017ff5f8d166b`
- WP1: `1a9a7a18ccf889d03067850ba9fe0c804bfc36b1`
- WP2 capture slice: `b8640d5f2a3a5cd49451c78db93ffd0713b289c4`

WP0, WP1, and WP2 automated validation are green. WP1/WP2 CI use PostgreSQL 17 and exercise the real persistence integration test.

## Immediate gate

Do not redesign the architecture before exercising the current WP2 extension against real job listings.

The manual smoke should verify:

- extension loads from `apps/extension/dist`
- generic page capture succeeds on real job pages
- schema.org JobPosting metadata is used where available
- fallback capture still preserves useful source text when metadata is weak
- Saved and Applied both persist through the API
- full-app handoff opens the captured record
- source URL and source text round-trip unchanged

Fix evidence-backed generic capture problems before adding source-specific scrapers.

## Next implementation objective after smoke

Proceed to WP3: Google authentication and the first cross-machine dogfood gate.

Replace the temporary development identity with Google-authenticated user identity while preserving the existing `user_id` ownership boundary.

Target behavior:

- user signs in with Google
- web and extension resolve to the same Application Trail account
- extension no longer sends a generated development UUID in normal operation
- API validates authenticated identity server-side
- captured data remains authorization-scoped by Application Trail user ID
- data captured on machine A can be retrieved from machine B against the same hosted backend
- no privileged Google, database, or service credentials enter extension assets or Git

The temporary dev identity may remain behind its explicit environment flag for local testing, but must not become a production fallback.

## Scope discipline

Do not start AI enrichment, duplicate/repost semantics, resume analysis, or the local AI bridge during WP3 unless Google auth implementation genuinely requires a shared seam.

The immediate product goal remains dogfoodable capture, not feature breadth.

## Validation and handoff

Run all existing validation plus any auth-focused tests introduced. Preserve the PostgreSQL integration gate. Update `currentHandoff.md` and this file at the next meaningful checkpoint.
