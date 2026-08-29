# Current Handoff

Date: 2026-08-29

## Current state

Application Trail has been named and its public repository created. The repository was initialized with AGPL-3.0, consistent with the intended model of public application code plus a hosted service.

Product discovery has established the core MVP workflow and architecture, but executable application scaffolding has not yet been created.

## Product direction

Application Trail is a job application tracker that becomes a personal job-market intelligence system over time.

Immediate user need:

- capture jobs/applications quickly from Chrome/Edge
- stop losing track of applications
- preserve the original posting and URL
- synchronize across three primary machines
- identify likely duplicate/reposted roles

Longer-term value:

- analyze requested skills and terminology
- compare current market language with durable resume wording
- distinguish missing skills from differently worded existing skills
- analyze outcomes by resume, source, domain, and other dimensions
- automate response/status capture where practical

## Accepted decisions

- Product name: Application Trail
- Repo: public
- License: AGPL-3.0
- Chrome/Edge first, Firefox later
- Extension is capture/light-review surface
- Complex work hands off to full app in a new tab
- Web app is primary management/analytics surface
- Google OAuth is preferred authentication
- PostgreSQL is preferred canonical persistence; existing Hostinger VPS is available
- Browser/local storage is not canonical
- MVP status: Saved -> Applied / Passed
- Source URL and original job description must be preserved
- Opportunity is distinct from Listing Observation/Snapshot
- Duplicate/repost candidates are flagged, explained, and user-resolved; never silently merged
- Application history is event-backed even if MVP UI shows a simple status
- Exact submitted resume artifact is associated with an application
- Early resume variants may change truthful presentation elements such as display title without encouraging bespoke per-job rewriting
- AI is acceptable and desired
- Ollama is preferred locally
- Hosted BYOK providers should be supported behind the same provider abstraction
- Review Room is the reference implementation for existing provider/Ollama patterns
- Durable user-entered API keys should be protected locally, not stored in PostgreSQL or Chrome sync/session storage
- Contact/Farley File functionality is deferred and may become a separate companion product
- Analytics priority will be driven by accumulated dogfood data rather than fully ranked in advance

## Reference implementation checked

`Three-Wheeled-Sloth-Studio/Review-Room` currently contains useful patterns in:

- `ollama-provider.js`
- `gemini-provider.js`
- `provider-errors.js`
- `popup.js`
- `settings.js`
- `service-worker.js`

Review Room directly calls local Ollama and supports Gemini BYOK with structured output. Application Trail should reuse those product patterns while improving durable credential storage and allowing a local bridge when needed.

## Next work

Start WP0 in `refs/planning/mvp-roadmap.md`.

The next checkpoint should be executable: a minimal TypeScript monorepo with build/test/typecheck support and the smallest extension/web/API/domain surfaces needed for the first capture vertical slice.

Do not spend another development slice expanding planning unless implementation exposes a real unresolved product or architecture question.
