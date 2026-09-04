---
type: Project Reference Guide
title: Application Trail Project References
description: Durable product, architecture, planning, deployment, validation, and handoff knowledge for Application Trail.
status: stable
tags: [application-trail, project-memory, okf]
---
# Project References

This directory is the durable product, architecture, planning, and handoff record for Application Trail.

It is aligned additively with Agent Academy and exposed as an OKF v0.2 knowledge bundle. Existing Application Trail documents remain authoritative; generated indexes provide discovery rather than duplicate state.

## Current authoritative documents

- `project.yaml` - project identity, current phase, and major constraints
- `agents.yaml` - authoritative agent reading order and project-memory operating rules
- `product/product-requirements.md` - product requirements and scope
- `architecture/system-architecture.md` - system boundaries and topology
- `architecture/domain-model.md` - core entities and data semantics
- `architecture/security-and-secrets.md` - public-repo and credential rules
- `architecture/review-room-ai-reference.md` - reusable AI-provider lessons from Review Room
- `deployment/wp3-hosted-deployment.md` - accepted WP3 production deployment contract
- `planning/mvp-roadmap.md` - implementation sequence for the first dogfoodable release
- `planning/todos.yaml` - current durable work queue
- `planning/decisions.yaml` - durable implementation decisions
- `planning/openQuestions.yaml` - unresolved project facts that must not be guessed
- `implementation/fileMap.yaml` - high-value source and guidance map
- `testing/validationCommands.yaml` - normal repository validation commands
- `handoffs/currentHandoff.md` - current project checkpoint
- `handoffs/next-dev-prompt.md` - next implementation instructions

## OKF discovery

`index.md` files are deterministic generated discovery artifacts. Do not edit them manually. Regenerate with:

```text
npm run generate:refs
```

Validate the refs bundle with:

```text
npm run validate:refs
```

See `okfProfile.yaml` and `implementation/okfCompatibility.md` for the compatibility boundary.

## Documentation policy

Prefer updating canonical documents over creating overlapping planning files. Add a new reference only when it captures durable knowledge that does not already have an authoritative home.
