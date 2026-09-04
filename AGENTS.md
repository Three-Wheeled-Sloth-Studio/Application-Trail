# Repository Guidance

Application Trail is a public-first product. Treat the repository as if every committed file will be visible to users and competitors.

## Agent Academy operating model

`refs/agents.yaml` is the authoritative agent operating-rules file for this repository. `refs/index.md` is the generated OKF discovery surface, not a replacement for the required reading order.

Before implementation work, read:

1. `refs/agents.yaml`
2. `refs/project.yaml`
3. `refs/planning/mvp-roadmap.md`
4. `refs/planning/todos.yaml`
5. `refs/handoffs/currentHandoff.md`
6. `refs/implementation/fileMap.yaml`
7. `refs/testing/validationCommands.yaml`

Then read the product, architecture, deployment, or handoff references relevant to the slice.

Do not hand-edit generated `refs/**/index.md` files. Regenerate them with `npm run generate:refs`.

## Product rules

- Do not make browser-local storage the canonical data store.
- Do not collapse a durable Opportunity into a single web Listing.
- Do not silently merge suspected duplicate or reposted listings.
- Preserve original source text and URL before normalization or AI enrichment.
- Keep source values, normalized values, provenance, confidence, and user corrections distinguishable.
- User corrections are authoritative and must survive reprocessing.
- Keep MVP user status simple: Saved, Applied, Passed. Rich history belongs in events underneath.
- Do not build per-job resume rewriting as the primary product behavior.
- Do not fabricate user skills or experience when suggesting terminology alignment.

## Architecture rules

- Prefer a TypeScript monorepo and modular monolith over premature services.
- Target Chromium first: Chrome and Edge. Keep WebExtension compatibility in mind for later Firefox support.
- Extension responsibilities: capture, lightweight review, source-page return, and full-app handoff.
- Web app responsibilities: management, editing, search, analytics, settings, and deeper workflows.
- API responsibilities: identity boundary, canonical persistence, authorization, and domain operations.
- PostgreSQL is the preferred canonical persistence layer.
- AI integrations must sit behind provider-neutral interfaces.
- Local Ollama use is preferred where practical, but do not couple domain logic to Ollama.

## Security rules

- Never commit `.env`, `.env.local`, credentials, tokens, production hostnames that embed secrets, database dumps, captured job data, resumes, or contact data.
- Nothing shipped inside a browser extension is secret.
- End-user hosted-provider API keys should be stored locally through a protected credential-store boundary, not in PostgreSQL and not in Chrome sync storage.
- Development secrets may use ignored `.env.local` files.

## Project-memory rules

- Keep durable project truth in `refs/`, not only in chat.
- Preserve OKF frontmatter on non-reserved Markdown concepts under `refs/`.
- Record durable implementation decisions in `refs/planning/decisions.yaml`.
- Record unresolved project facts in `refs/planning/openQuestions.yaml` instead of guessing.
- Update `refs/planning/todos.yaml` and `refs/handoffs/currentHandoff.md` when work state materially changes.
- Never infer OKF `verified` status from passing tests, generated indexes, Git history, or refs validation.
- Preserve the existing Application Trail refs organization. Agent Academy alignment is additive, not a reason to duplicate or rearrange mature project truth.

## Cross-platform path rule

Never create, rename, or retain two tracked paths that differ only by letter casing. The Git index is authoritative for collision checks. Run `npm run check:case-collisions`, and use a temporary intermediate filename for case-only renames.

## Development approach

Favor thin end-to-end slices over broad framework construction. Add abstraction only where a known requirement already creates the seam.

Before finishing a change, run the validation appropriate to the slice. `npm run validate` is the normal full repository gate.
