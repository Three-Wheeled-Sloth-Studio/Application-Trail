interface OpportunityRecordResponse {
  opportunity: {
    id: string;
    normalizedTitle: string;
    currentStatus: string;
  };
  company?: {
    canonicalName: string;
  };
  listings: Array<{
    observation: {
      sourceUrl: string;
      publishedTitle: string;
      publishedCompanyName: string;
      observedLocationText?: string;
    };
    snapshot: {
      sourceText: string;
      capturedAt: string;
    };
  }>;
  application?: {
    currentStatus: string;
  };
}

const API_BASE_URL = 'http://127.0.0.1:4310';
const status = document.querySelector<HTMLElement>('#status');
const recordNode = document.querySelector<HTMLElement>('#record');

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) node.textContent = value;
}

async function loadRecord(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const opportunityId = params.get('opportunityId');
  const devUserId = params.get('devUserId');

  if (!opportunityId || !devUserId) {
    if (status) status.textContent = 'Web shell ready. Capture a job from the extension to open a record.';
    return;
  }

  if (status) status.textContent = 'Loading captured record...';
  const response = await fetch(`${API_BASE_URL}/api/opportunities/${encodeURIComponent(opportunityId)}`, {
    headers: { 'x-application-trail-user-id': devUserId }
  });
  if (!response.ok) {
    throw new Error(`Could not load record. API returned HTTP ${response.status}.`);
  }

  const record = await response.json() as OpportunityRecordResponse;
  const listing = record.listings[0];
  setText('#record-title', listing?.observation.publishedTitle ?? record.opportunity.normalizedTitle);
  setText('#record-company', record.company?.canonicalName ?? listing?.observation.publishedCompanyName ?? 'Unknown company');
  setText('#record-status', record.application?.currentStatus ?? record.opportunity.currentStatus);
  setText('#record-location', listing?.observation.observedLocationText ?? 'Location not extracted yet');
  setText('#record-source-text', listing?.snapshot.sourceText ?? 'No source text captured.');

  const sourceLink = document.querySelector<HTMLAnchorElement>('#record-source');
  if (sourceLink && listing?.observation.sourceUrl) {
    sourceLink.href = listing.observation.sourceUrl;
    sourceLink.textContent = 'Return to original listing';
  }

  if (recordNode) recordNode.hidden = false;
  if (status) status.textContent = 'Captured record loaded from PostgreSQL.';
}

void loadRecord().catch(error => {
  console.error('Application Trail record load failed', error);
  if (status) status.textContent = error instanceof Error ? error.message : 'Could not load record.';
});
