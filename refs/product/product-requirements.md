# Product Requirements

## Product summary

Application Trail is a job application tracking and job-market intelligence system. Its first capture surface is a Chromium browser extension. The extension should let a user save a job or record an application in seconds, review the extracted data, and optionally hand off to the full application in a new tab for work that is awkward in an extension popup.

The system preserves job source evidence and synchronizes records across computers. Over time, the accumulated dataset becomes a market-intelligence source for skills, qualifications, terminology, compensation, presence type, role domains, reposting behavior, and application outcomes.

The product is optimized first for intensive single-user dogfooding while avoiding architecture that prevents later hosted-service productization.

## Immediate goals

1. Capture jobs and applications with very low friction.
2. Stop losing track of where and when applications were submitted.
3. Preserve the original job URL and original job description.
4. Synchronize the canonical record across machines and browser sessions.
5. Extract useful structured information automatically where possible.
6. Support saved-but-not-applied jobs with a fast return path to the source listing.
7. Flag likely duplicate or reposted opportunities.
8. Associate an application with the exact resume artifact submitted.

## Core capture targets

Capture when present:

- company
- job title
- source URL and source site
- external requisition or job ID
- capture date
- application date
- location
- presence type: onsite, hybrid, remote, flexible, unclear
- salary minimum and maximum
- currency and compensation period
- employment type
- role/function domain
- industry/domain
- responsibilities
- required qualifications
- preferred qualifications
- skills
- technologies/tools
- keywords
- certifications
- education requirements
- experience requirements
- original job description

## Capture workflow

### Saved job

1. User opens a listing and triggers the extension.
2. The extension captures immediately and creates a provisional record.
3. The popup shows extracted fields and uncertainty without blocking save.
4. User may correct obvious errors.
5. User may open the full record in a new application tab.
6. The record retains a direct return path to the source listing.
7. MVP status is `saved`.

### Applied job

The same flow supports an `applied` action. The application record stores the application date and exact submitted resume artifact when known.

### Passed job

A saved opportunity may be marked `passed`. MVP does not need a more elaborate pre-application pipeline.

## Full application

The extension is not the main management UI. The web application will provide progressively richer support for:

- saved jobs and applications
- editing
- search and filtering
- status management
- source snapshots
- duplicate/repost review
- resume association
- analytics
- AI/provider settings
- future automation

## Duplicate and repost detection

A durable job Opportunity is separate from a specific Listing Observation.

A possible duplicate/repost should be flagged when evidence suggests a match. Evidence may include:

1. exact URL
2. external requisition ID
3. normalized company, title, and location
4. job-description fingerprint
5. semantic similarity of descriptions
6. posting history and timing

The user must be able to resolve a suspected match as:

- same opportunity
- similar but different opportunity
- unsure

Do not silently merge records.

## Resume behavior

Applications should reference the exact resume artifact submitted.

Early resume support should accommodate a small set of durable base resumes and lightweight truthful presentation variants, especially display-title alignment with the target role. The product should not default to rewriting a resume for every job.

Longer term, compare aggregate market language with resume language to distinguish:

- a skill the user does not possess
- a skill the user possesses but describes differently

Terminology suggestions must remain grounded in actual user experience.

## AI-assisted extraction

Use deterministic extraction first where reliable, including DOM structure, JSON-LD, known ATS metadata, and regex. Use AI for semantic tasks such as qualification classification, skill normalization, presence inference, domain classification, and listing similarity.

Local Ollama is preferred where practical. Users may optionally configure a supported hosted provider with their own key. Domain logic must remain provider-neutral.

## Data provenance

For extracted or normalized values, preserve enough metadata to distinguish:

- source text
- deterministic extraction
- AI inference
- normalized concept
- manual user correction
- confidence/evidence where meaningful

User corrections are authoritative and must not be overwritten by later automated reprocessing.

## MVP

The first useful MVP supports:

1. Chrome/Edge extension activation on a real job page.
2. Immediate provisional capture.
3. Save as `saved` or `applied`.
4. Preserve source URL and original description.
5. Lightweight popup review.
6. Full-app handoff in a new tab.
7. Google sign-in.
8. Canonical synchronized persistence.
9. Basic status update: saved, applied, passed.
10. Resume artifact association.
11. Duplicate/repost warning.
12. Graceful manual fallback when extraction is incomplete.

## Deferred but architecturally anticipated

- email-based confirmation and response detection
- interview and rejection automation
- stale application reminders
- listing-change and closure monitoring
- richer event history UI
- contact/relationship intelligence and possible Farley File companion product
- advanced market analytics
- performance analysis by resume version, source, company type, and domain
- job discovery
- mobile application
- public SaaS billing and broader tenancy concerns
