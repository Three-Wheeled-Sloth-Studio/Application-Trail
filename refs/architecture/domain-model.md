---
type: Domain Model
title: Application Trail Domain Model
description: Canonical entities, ownership boundaries, listing evidence, applications, resumes, and duplicate or repost semantics.
status: stable
tags: [application-trail, domain-model, persistence]
---
# Domain Model

## Core distinction: Opportunity vs Listing

A durable employment opportunity is not the same thing as a web posting.

### Company

Normalized employer entity.

Suggested properties:

- id
- canonicalName
- aliases
- domain/website when known
- createdAt
- updatedAt

A Listing Observation also retains the employer name exactly as published. Company normalization must not destroy the source value.

### Opportunity

The durable role the user may pursue.

Suggested properties:

- id
- userId
- companyId
- normalizedTitle
- currentStatus: saved | applied | passed
- firstSeenAt
- lastSeenAt
- createdAt
- updatedAt

An Opportunity can have many Listing Observations over time.

### Listing Observation

Records that an Opportunity was observed at a specific source, URL, and time.

Suggested properties:

- id
- opportunityId
- sourceSite
- sourceUrl
- externalJobId
- publishedTitle
- publishedCompanyName
- observedAt
- observedLocationText
- listingState when known
- snapshotId

A new Listing Observation should not automatically mean a new Opportunity, and a similar observation must not be silently attached to an existing Opportunity without sufficient evidence or user resolution.

### Listing Snapshot

Immutable or append-only source evidence captured for a Listing Observation.

Suggested properties:

- id
- listingObservationId
- capturedAt
- pageTitle
- sourceText
- structuredMetadata
- contentFingerprint
- parserVersion

Later reprocessing should produce new derived data rather than rewriting historical source evidence.

## Structured extracted facts

Do not force every semantic extraction into wide nullable columns if provenance would be lost. The implementation may use typed tables/columns for stable high-value fields plus evidence records for semantic extraction.

Every derived fact should be able to answer, where meaningful:

- What was the source wording?
- What normalized concept did we assign?
- Was it source metadata, deterministic extraction, AI inference, or user input?
- What evidence supported it?
- What confidence did the extractor report?
- Has the user corrected it?

High-value concepts include:

- location
- presence type
- salary
- employment type
- seniority
- role domain
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

## Application

Represents the user's pursuit of an Opportunity.

Suggested properties:

- id
- userId
- opportunityId
- currentStatus
- appliedAt
- submittedResumeArtifactId
- notes
- outcome
- createdAt
- updatedAt

MVP exposes a simple current status, but state changes create Application Events underneath.

## Application Event

Append-oriented history suitable for later automation and richer hiring-process tracking.

Initial/future event types may include:

- job_captured
- application_submitted
- status_changed
- recruiter_contacted
- recruiter_response_received
- screening_scheduled
- screening_completed
- interview_scheduled
- interview_completed
- follow_up_sent
- rejection_received
- offer_received
- offer_accepted
- offer_declined
- user_withdrew
- listing_closed
- no_response

Suggested common properties:

- id
- applicationId
- eventType
- occurredAt
- source: user | system | integration | ai
- sourceReference
- payload
- createdAt

## Resume model

### Resume Base

Represents durable resume content/positioning.

### Resume Variant

Represents a limited presentation variant that does not fabricate experience. Early use case: display-title alignment with the target posting.

Example variants may differ only by a headline such as `Senior Product Manager` versus `Director of Product Management`.

### Resume Artifact

The exact immutable document submitted with an application.

Suggested properties:

- id
- userId
- baseResumeId
- variantId
- filename
- storageReference
- contentHash
- renderedTitle
- createdAt

The Application references the exact artifact, so historical analysis can always determine what was actually sent.

## Duplicate/Repost Candidate

A comparison record or derived result representing evidence that two Listing Observations may belong to the same Opportunity.

Potential evidence:

- exact URL match
- external requisition ID match
- normalized company/title/location match
- source-text fingerprint similarity
- semantic similarity
- timing/history

Suggested resolution states:

- unresolved
- same_opportunity
- different_opportunity
- unsure

Store the evidence/reasoning inputs needed to explain the warning. Do not store opaque AI conclusions as the only evidence.

## Contacts

Contacts are intentionally not an MVP domain center. Application Events should be able to reference a future contact/person ID without requiring contact-management behavior now.

A richer Farley File style contact system may become a separate product and integration later.
