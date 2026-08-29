# Repository Guidance

Application Trail is a public-first product. Treat the repository as if every committed file will be visible to users and competitors.

## Read first

Before implementation work, read:

1. `refs/project.yaml`
2. `refs/product/product-requirements.md`
3. `refs/architecture/system-architecture.md`
4. `refs/architecture/domain-model.md`
5. `refs/architecture/security-and-secrets.md`
6. `refs/handoffs/currentHandoff.md`
7. `refs/handoffs/next-dev-prompt.md`

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

## Development approach

Favor thin end-to-end slices over broad framework construction. The first useful executable slice should capture one real listing and persist/retrieve it. Add abstraction only where a known requirement already creates the seam.

Update the handoff files whenever pausing at a meaningful checkpoint.
