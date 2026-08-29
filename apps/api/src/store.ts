import { randomUUID } from 'node:crypto';
import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  CaptureListingInput,
  Company,
  ListingObservation,
  ListingSnapshot,
  Opportunity,
  OpportunityRecord,
  UserId
} from '@application-trail/domain';
import type { Pool, PoolClient } from 'pg';

export interface ApplicationTrailStore {
  captureOpportunity(userId: UserId, input: CaptureListingInput): Promise<OpportunityRecord>;
  getOpportunity(userId: UserId, opportunityId: string): Promise<OpportunityRecord | null>;
  setApplicationStatus(userId: UserId, opportunityId: string, status: ApplicationStatus): Promise<OpportunityRecord>;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function canonicalKey(value: string): string {
  return value.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
}

async function ensureUser(client: PoolClient, userId: UserId): Promise<void> {
  await client.query('INSERT INTO app_user (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [userId]);
}

export class PgApplicationTrailStore implements ApplicationTrailStore {
  constructor(private readonly pool: Pool) {}

  async captureOpportunity(userId: UserId, input: CaptureListingInput): Promise<OpportunityRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await ensureUser(client, userId);

      const now = new Date();
      const observedAt = input.observedAt ? new Date(input.observedAt) : now;
      const companyName = input.canonicalCompanyName?.trim() || input.publishedCompanyName.trim();
      const companyId = randomUUID();
      const companyResult = await client.query(
        `INSERT INTO company (id, canonical_key, canonical_name, aliases, created_at, updated_at)
         VALUES ($1, $2, $3, '[]'::jsonb, $4, $4)
         ON CONFLICT (canonical_key) DO UPDATE SET updated_at = EXCLUDED.updated_at
         RETURNING id, canonical_name, aliases, website, created_at, updated_at`,
        [companyId, canonicalKey(companyName), companyName, now]
      );
      const companyRow = companyResult.rows[0];

      const opportunityId = randomUUID();
      await client.query(
        `INSERT INTO opportunity
          (id, user_id, company_id, normalized_title, current_status, first_seen_at, last_seen_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $7)`,
        [
          opportunityId,
          userId,
          companyRow.id,
          input.normalizedTitle?.trim() || input.publishedTitle.trim(),
          input.status,
          observedAt,
          now
        ]
      );

      const observationId = randomUUID();
      await client.query(
        `INSERT INTO listing_observation
          (id, user_id, opportunity_id, source_site, source_url, external_job_id, published_title,
           published_company_name, observed_at, observed_location_text, listing_state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'unknown')`,
        [
          observationId,
          userId,
          opportunityId,
          input.sourceSite,
          input.sourceUrl,
          input.externalJobId ?? null,
          input.publishedTitle,
          input.publishedCompanyName,
          observedAt,
          input.observedLocationText ?? null
        ]
      );

      const snapshotId = randomUUID();
      await client.query(
        `INSERT INTO listing_snapshot
          (id, user_id, listing_observation_id, captured_at, page_title, source_text,
           structured_metadata, parser_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'wp1-raw-v1')`,
        [
          snapshotId,
          userId,
          observationId,
          now,
          input.pageTitle,
          input.sourceText,
          input.structuredMetadata ? JSON.stringify(input.structuredMetadata) : null
        ]
      );

      if (input.status === 'applied') {
        const applicationId = randomUUID();
        await client.query(
          `INSERT INTO application
            (id, user_id, opportunity_id, current_status, applied_at, created_at, updated_at)
           VALUES ($1, $2, $3, 'applied', $4, $4, $4)`,
          [applicationId, userId, opportunityId, now]
        );
        await client.query(
          `INSERT INTO application_event
            (id, user_id, application_id, event_type, occurred_at, source, payload, created_at)
           VALUES ($1, $2, $3, 'application_submitted', $4, 'user', $5, $4)`,
          [randomUUID(), userId, applicationId, now, JSON.stringify({ sourceUrl: input.sourceUrl })]
        );
      }

      await client.query('COMMIT');
      const record = await this.getOpportunity(userId, opportunityId);
      if (!record) throw new Error('Captured opportunity could not be reloaded.');
      return record;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async getOpportunity(userId: UserId, opportunityId: string): Promise<OpportunityRecord | null> {
    const opportunityResult = await this.pool.query(
      `SELECT o.*, c.canonical_name, c.aliases, c.website, c.created_at AS company_created_at,
              c.updated_at AS company_updated_at
       FROM opportunity o
       LEFT JOIN company c ON c.id = o.company_id
       WHERE o.id = $1 AND o.user_id = $2`,
      [opportunityId, userId]
    );
    if (!opportunityResult.rowCount) return null;

    const row = opportunityResult.rows[0];
    const opportunity: Opportunity = {
      id: row.id,
      userId: row.user_id,
      companyId: row.company_id ?? undefined,
      normalizedTitle: row.normalized_title,
      currentStatus: row.current_status,
      firstSeenAt: iso(row.first_seen_at),
      lastSeenAt: iso(row.last_seen_at),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at)
    };

    const company: Company | undefined = row.company_id
      ? {
          id: row.company_id,
          canonicalName: row.canonical_name,
          aliases: Array.isArray(row.aliases) ? row.aliases : [],
          website: row.website ?? undefined,
          createdAt: iso(row.company_created_at),
          updatedAt: iso(row.company_updated_at)
        }
      : undefined;

    const listingResult = await this.pool.query(
      `SELECT lo.*, ls.id AS snapshot_id, ls.captured_at, ls.page_title, ls.source_text,
              ls.structured_metadata, ls.content_fingerprint, ls.parser_version
       FROM listing_observation lo
       JOIN listing_snapshot ls ON ls.listing_observation_id = lo.id AND ls.user_id = lo.user_id
       WHERE lo.opportunity_id = $1 AND lo.user_id = $2
       ORDER BY lo.observed_at ASC`,
      [opportunityId, userId]
    );

    const listings = listingResult.rows.map(listingRow => {
      const observation: ListingObservation = {
        id: listingRow.id,
        userId: listingRow.user_id,
        opportunityId: listingRow.opportunity_id,
        sourceSite: listingRow.source_site,
        sourceUrl: listingRow.source_url,
        externalJobId: listingRow.external_job_id ?? undefined,
        publishedTitle: listingRow.published_title,
        publishedCompanyName: listingRow.published_company_name,
        observedAt: iso(listingRow.observed_at),
        observedLocationText: listingRow.observed_location_text ?? undefined,
        listingState: listingRow.listing_state,
        snapshotId: listingRow.snapshot_id
      };
      const snapshot: ListingSnapshot = {
        id: listingRow.snapshot_id,
        userId: listingRow.user_id,
        listingObservationId: listingRow.id,
        capturedAt: iso(listingRow.captured_at),
        pageTitle: listingRow.page_title,
        sourceText: listingRow.source_text,
        structuredMetadata: listingRow.structured_metadata ?? undefined,
        contentFingerprint: listingRow.content_fingerprint ?? undefined,
        parserVersion: listingRow.parser_version
      };
      return { observation, snapshot };
    });

    const applicationResult = await this.pool.query(
      'SELECT * FROM application WHERE opportunity_id = $1 AND user_id = $2',
      [opportunityId, userId]
    );
    let application: Application | undefined;
    let events: ApplicationEvent[] = [];
    if (applicationResult.rowCount) {
      const applicationRow = applicationResult.rows[0];
      application = {
        id: applicationRow.id,
        userId: applicationRow.user_id,
        opportunityId: applicationRow.opportunity_id,
        currentStatus: applicationRow.current_status,
        ...(applicationRow.applied_at ? { appliedAt: iso(applicationRow.applied_at) } : {}),
        ...(applicationRow.submitted_resume_artifact_id
          ? { submittedResumeArtifactId: applicationRow.submitted_resume_artifact_id }
          : {}),
        ...(applicationRow.notes ? { notes: applicationRow.notes } : {}),
        ...(applicationRow.outcome ? { outcome: applicationRow.outcome } : {}),
        createdAt: iso(applicationRow.created_at),
        updatedAt: iso(applicationRow.updated_at)
      };
      const eventResult = await this.pool.query(
        'SELECT * FROM application_event WHERE application_id = $1 AND user_id = $2 ORDER BY occurred_at ASC, created_at ASC',
        [applicationRow.id, userId]
      );
      events = eventResult.rows.map(eventRow => ({
        id: eventRow.id,
        userId: eventRow.user_id,
        applicationId: eventRow.application_id,
        eventType: eventRow.event_type,
        occurredAt: iso(eventRow.occurred_at),
        source: eventRow.source,
        sourceReference: eventRow.source_reference ?? undefined,
        payload: eventRow.payload ?? undefined,
        createdAt: iso(eventRow.created_at)
      }));
    }

    return {
      opportunity,
      ...(company ? { company } : {}),
      listings,
      ...(application ? { application } : {}),
      events
    };
  }

  async setApplicationStatus(userId: UserId, opportunityId: string, status: ApplicationStatus): Promise<OpportunityRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const applicationResult = await client.query(
        'SELECT * FROM application WHERE opportunity_id = $1 AND user_id = $2 FOR UPDATE',
        [opportunityId, userId]
      );
      if (!applicationResult.rowCount) {
        throw new Error('Application not found for this user and opportunity.');
      }

      const application = applicationResult.rows[0];
      const previousStatus = application.current_status as ApplicationStatus;
      const now = new Date();
      await client.query(
        'UPDATE application SET current_status = $1, updated_at = $2 WHERE id = $3 AND user_id = $4',
        [status, now, application.id, userId]
      );
      await client.query(
        'UPDATE opportunity SET current_status = $1, updated_at = $2 WHERE id = $3 AND user_id = $4',
        [status, now, opportunityId, userId]
      );
      await client.query(
        `INSERT INTO application_event
          (id, user_id, application_id, event_type, occurred_at, source, payload, created_at)
         VALUES ($1, $2, $3, 'status_changed', $4, 'user', $5, $4)`,
        [
          randomUUID(),
          userId,
          application.id,
          now,
          JSON.stringify({ previousStatus, nextStatus: status })
        ]
      );
      await client.query('COMMIT');

      const record = await this.getOpportunity(userId, opportunityId);
      if (!record) throw new Error('Updated opportunity could not be reloaded.');
      return record;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
