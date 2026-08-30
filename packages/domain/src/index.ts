export type UserId = string;
export type CompanyId = string;
export type OpportunityId = string;
export type ListingObservationId = string;
export type ListingSnapshotId = string;
export type ApplicationId = string;
export type ApplicationEventId = string;
export type ResumeArtifactId = string;

export const OPPORTUNITY_STATUSES = ['saved', 'applied', 'passed'] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export function isOpportunityStatus(value: string): value is OpportunityStatus {
  return (OPPORTUNITY_STATUSES as readonly string[]).includes(value);
}

export type FactSource = 'source_metadata' | 'deterministic' | 'ai' | 'user';

export interface FactProvenance {
  source: FactSource;
  sourceText?: string;
  evidence?: string;
  confidence?: number;
  correctedByUser?: boolean;
}

export interface Company {
  id: CompanyId;
  canonicalName: string;
  aliases: readonly string[];
  website?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: OpportunityId;
  userId: UserId;
  companyId?: CompanyId;
  normalizedTitle: string;
  currentStatus: OpportunityStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunitySummary {
  id: OpportunityId;
  normalizedTitle: string;
  companyName?: string;
  currentStatus: OpportunityStatus;
  latestSourceUrl?: string;
  latestLocationText?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
}

export type ListingState = 'open' | 'closed' | 'unknown';

export interface ListingObservation {
  id: ListingObservationId;
  userId: UserId;
  opportunityId: OpportunityId;
  sourceSite: string;
  sourceUrl: string;
  externalJobId?: string;
  publishedTitle: string;
  publishedCompanyName: string;
  observedAt: string;
  observedLocationText?: string;
  listingState: ListingState;
  snapshotId: ListingSnapshotId;
}

export interface ListingSnapshot {
  id: ListingSnapshotId;
  userId: UserId;
  listingObservationId: ListingObservationId;
  capturedAt: string;
  pageTitle: string;
  sourceText: string;
  structuredMetadata?: Readonly<Record<string, unknown>>;
  contentFingerprint?: string;
  parserVersion: string;
}

export type ApplicationStatus = 'applied' | 'passed';

export interface Application {
  id: ApplicationId;
  userId: UserId;
  opportunityId: OpportunityId;
  currentStatus: ApplicationStatus;
  appliedAt?: string;
  submittedResumeArtifactId?: ResumeArtifactId;
  notes?: string;
  outcome?: string;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationEventSource = 'user' | 'system' | 'integration' | 'ai';

export type ApplicationEventType =
  | 'job_captured'
  | 'application_submitted'
  | 'status_changed'
  | 'recruiter_contacted'
  | 'recruiter_response_received'
  | 'screening_scheduled'
  | 'screening_completed'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'follow_up_sent'
  | 'rejection_received'
  | 'offer_received'
  | 'offer_accepted'
  | 'offer_declined'
  | 'user_withdrew'
  | 'listing_closed'
  | 'no_response';

export interface ApplicationEvent {
  id: ApplicationEventId;
  userId: UserId;
  applicationId: ApplicationId;
  eventType: ApplicationEventType;
  occurredAt: string;
  source: ApplicationEventSource;
  sourceReference?: string;
  payload?: Readonly<Record<string, unknown>>;
  createdAt: string;
}

export interface ResumeArtifact {
  id: ResumeArtifactId;
  userId: UserId;
  baseResumeId?: string;
  variantId?: string;
  filename: string;
  storageReference: string;
  contentHash: string;
  renderedTitle: string;
  createdAt: string;
}

export interface CaptureListingInput {
  sourceSite: string;
  sourceUrl: string;
  pageTitle: string;
  sourceText: string;
  publishedTitle: string;
  publishedCompanyName: string;
  externalJobId?: string;
  observedLocationText?: string;
  structuredMetadata?: Readonly<Record<string, unknown>>;
  normalizedTitle?: string;
  canonicalCompanyName?: string;
  status: 'saved' | 'applied';
  observedAt?: string;
}

export interface ListingRecord {
  observation: ListingObservation;
  snapshot: ListingSnapshot;
}

export interface OpportunityRecord {
  opportunity: Opportunity;
  company?: Company;
  listings: readonly ListingRecord[];
  application?: Application;
  events: readonly ApplicationEvent[];
}
