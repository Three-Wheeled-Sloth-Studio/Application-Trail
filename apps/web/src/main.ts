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

interface OpportunitySummary {
  id: string;
  normalizedTitle: string;
  companyName?: string;
  currentStatus: string;
  latestSourceUrl?: string;
  latestLocationText?: string;
  updatedAt: string;
}

interface CurrentUser {
  userId: string;
  provider: string;
  email?: string;
  displayName?: string;
}

const status = document.querySelector<HTMLElement>('#status');
const recordNode = document.querySelector<HTMLElement>('#record');
const opportunitiesSection = document.querySelector<HTMLElement>('#opportunities-section');
const opportunityList = document.querySelector<HTMLElement>('#opportunity-list');
const opportunityCount = document.querySelector<HTMLElement>('#opportunity-count');
const signIn = document.querySelector<HTMLElement>('#sign-in');
const signOut = document.querySelector<HTMLButtonElement>('#sign-out');
const accountName = document.querySelector<HTMLElement>('#account-name');

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) node.textContent = value;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
}

async function loadCurrentUser(): Promise<CurrentUser | null> {
  const response = await request('/auth/me');
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Could not check session. HTTP ${response.status}.`);
  return response.json() as Promise<CurrentUser>;
}

function renderSignedIn(user: CurrentUser): void {
  if (signIn) signIn.hidden = true;
  if (signOut) signOut.hidden = false;
  if (accountName) accountName.textContent = user.displayName ?? user.email ?? 'Signed in';
}

function renderSignedOut(): void {
  if (signIn) signIn.hidden = false;
  if (signOut) signOut.hidden = true;
  if (accountName) accountName.textContent = '';
  if (opportunitiesSection) opportunitiesSection.hidden = true;
  if (recordNode) recordNode.hidden = true;
  if (status) status.textContent = 'Sign in with Google to see your synchronized Application Trail.';
}

async function loadOpportunities(): Promise<void> {
  const response = await request('/api/opportunities');
  if (!response.ok) throw new Error(`Could not load opportunities. HTTP ${response.status}.`);
  const payload = await response.json() as { opportunities: OpportunitySummary[] };
  if (!opportunityList) return;
  opportunityList.replaceChildren();
  for (const opportunity of payload.opportunities) {
    const link = document.createElement('a');
    link.className = 'opportunity';
    link.href = `/?opportunityId=${encodeURIComponent(opportunity.id)}`;
    const title = document.createElement('strong');
    title.textContent = opportunity.normalizedTitle;
    const company = document.createElement('span');
    company.textContent = opportunity.companyName ?? 'Unknown company';
    const meta = document.createElement('span');
    meta.className = 'muted';
    meta.textContent = [opportunity.currentStatus, opportunity.latestLocationText].filter(Boolean).join(' | ');
    link.append(title, company, meta);
    opportunityList.append(link);
  }
  if (opportunityCount) opportunityCount.textContent = String(payload.opportunities.length);
  if (opportunitiesSection) opportunitiesSection.hidden = false;
}

async function loadRecord(opportunityId: string): Promise<void> {
  const response = await request(`/api/opportunities/${encodeURIComponent(opportunityId)}`);
  if (!response.ok) throw new Error(`Could not load record. API returned HTTP ${response.status}.`);

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

  if (opportunitiesSection) opportunitiesSection.hidden = true;
  if (recordNode) recordNode.hidden = false;
}

async function initialize(): Promise<void> {
  const user = await loadCurrentUser();
  if (!user) {
    renderSignedOut();
    return;
  }
  renderSignedIn(user);
  const opportunityId = new URLSearchParams(window.location.search).get('opportunityId');
  if (opportunityId) {
    if (status) status.textContent = 'Loading captured record...';
    await loadRecord(opportunityId);
    if (status) status.textContent = 'Captured record loaded from synchronized PostgreSQL storage.';
  } else {
    if (status) status.textContent = 'Loading your synchronized opportunities...';
    await loadOpportunities();
    if (status) status.textContent = 'Application Trail is synchronized and ready.';
  }
}

signOut?.addEventListener('click', async () => {
  await request('/auth/logout', { method: 'POST', body: '{}' });
  window.location.assign('/');
});

void initialize().catch(error => {
  console.error('Application Trail load failed', error);
  if (status) status.textContent = error instanceof Error ? error.message : 'Could not load Application Trail.';
});
