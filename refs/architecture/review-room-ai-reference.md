# Review Room AI Reference

Application Trail should reuse proven ideas from `Three-Wheeled-Sloth-Studio/Review-Room` without copying its current browser-only constraints blindly.

## Useful existing patterns

Review Room currently demonstrates:

- direct Ollama availability/model discovery through `http://localhost:11434`
- Ollama generation with streamed response handling
- a provider switch between local Ollama and Gemini BYOK
- provider-specific error normalization
- structured Gemini output using JSON schemas
- synced non-secret preferences such as selected provider and model
- a dedicated provider-settings surface
- popup-to-full-tab handoff for work that benefits from more room

These patterns fit Application Trail well conceptually.

## What to reuse

### Provider-neutral product operations

Keep provider choice outside product/domain behavior. Application Trail should ask for structured operations such as job extraction or listing comparison, then delegate to a provider adapter.

### Structured responses

Prefer JSON-schema or equivalent structured results for semantic extraction. Validate outputs before converting them into domain facts.

### Local-first provider choice

Ollama should remain a first-class path where available. Hosted providers should be optional BYOK alternatives rather than mandatory cloud dependencies.

### Full-tab handoff

Review Room already uses the extension popup as a launch/capture surface and opens a larger extension page for richer work. Application Trail should follow the same interaction principle, although its full management surface will ultimately be the web application.

## What to change

### Credential persistence

Application Trail should not keep durable BYOK credentials only in session state, nor should it put them in Chrome sync storage.

The preferred production boundary is a local bridge plus protected local credential storage. Development `.env.local` support remains separate and ignored by Git.

### Direct browser-to-Ollama access

Review Room currently calls Ollama directly from extension code. Application Trail may begin by proving local connectivity similarly, but the target architecture allows a local bridge when needed for:

- more controlled CORS/origin behavior
- shared access from extension and hosted web app
- provider credential storage
- narrow local security boundaries
- consistent provider health/model discovery

Do not introduce the bridge before a vertical slice needs it, but do not design APIs that make it difficult to insert later.

## Reference files in Review Room

At bootstrap time, especially relevant files include:

- `ollama-provider.js`
- `gemini-provider.js`
- `provider-errors.js`
- `popup.js`
- `settings.js`
- `service-worker.js`
- `refs/handoffs/2026-07-27-gemini-byok-provider-plan.md`
- `refs/integrations/ollama.yaml`

Application Trail should cite or link back to the reference project in implementation decisions rather than duplicating its documentation wholesale.
