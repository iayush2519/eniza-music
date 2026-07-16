# ADR 0003: Independent-artist upload platform as the content model

**Status:** Accepted
**Date:** 2026-07-16

## Context

A streaming app needs a source of audio content. Three models were
considered: (a) a personal/self-hosted library streamer, (b) an
independent-artist upload platform, (c) a commercial catalog backed by a
licensed provider.

Option (c) requires an actual licensing agreement with a rights-holder
aggregator, which is outside the scope of an engineering project and would
block all development on a business/legal process. Option (a) is legally
simplest but doesn't exercise multi-user features (upload pipeline,
publishing, discovery across users) that make the project a meaningful
full-stack showcase.

## Decision

Build an independent-artist upload platform: artists upload tracks,
listeners discover and stream them. Design the catalog and streaming
modules so a licensed provider can be added as an additional content source
later without a rewrite (see `architecture/content-model.md` for the
concrete seams: `source` discriminator on tracks, a `resolvePlaybackUrl`
port, pluggable ingestion).

## Alternatives considered

- **Personal/self-hosted library streamer.** Rejected as the primary model:
  simpler, but doesn't require or showcase upload pipelines, transcoding,
  multi-user catalog/discovery, or artist-facing features.
- **Licensed commercial catalog.** Rejected for the initial release: requires
  a real licensing relationship that doesn't exist and isn't obtainable as
  part of an engineering exercise. The architecture keeps this option open
  for the future rather than closing it off.

## Consequences

- We need an upload/transcoding pipeline (S3 presigned uploads, BullMQ
  transcode jobs) as core infrastructure, not an optional extra.
- Content moderation / takedown handling becomes a real (if initially
  minimal) concern since users upload content directly — tracked as a
  future task, not implemented in the initial release.
- No real licensing/royalty logic is needed yet, but the schema reserves a
  `licenseType` field so this doesn't require a migration later.
