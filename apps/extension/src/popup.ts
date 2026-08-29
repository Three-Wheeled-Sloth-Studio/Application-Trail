import { captureActivePage, type CapturedPage } from './capture.js';

const API_BASE_URL = 'http://127.0.0.1:4310';
const WEB_BASE_URL = 'http://127.0.0.1:4320';

const titleNode = document.querySelector<HTMLElement>('#page-title');
const urlNode = document.querySelector<HTMLElement>('#page-url');
const detectedTitleNode = document.querySelector<HTMLElement>('#detected-title');
const detectedCompanyNode = document.querySelector<HTMLElement>('#detected-company');
const detectedLocationNode = document.querySelector<HTMLElement>('#detected-location');
const statusNode = document.querySelector<HTMLElement>('#capture-status');
const saveButton = document.querySelector<HTMLButtonElement>('#save');
const appliedButton = document.querySelector<HTMLButtonElement>('#applied');
const openButton = document.querySelector<HTMLButtonElement>('#open-record');

let activeTabId: number | undefined;
let capturedOpportunityId: string | undefined;
let developmentUserId: string | undefined;
let provisionalCapture: CapturedPage | undefined;

function setStatus(message: string): void {
  if (statusNode) statusNode.textContent = message;
}

async function getDevelopmentUserId(): Promise<string> {
  if (developmentUserId) return developmentUserId;
  const saved = await chrome.storage.local.get('applicationTrailDevUserId');
  const existing = saved.applicationTrailDevUserId;
  if (typeof existing === 'string' && existing) {
    developmentUserId = existing;
    return existing;
  }

  const generated = crypto.randomUUID();
  await chrome.storage.local.set({ applicationTrailDevUserId: generated });
  developmentUserId = generated;
  return generated;
}

async function loadActivePage(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id;

  if (titleNode) titleNode.textContent = tab?.title ?? 'Untitled page';
  if (urlNode) urlNode.textContent = tab?.url ?? 'URL unavailable';

  const capturable = Boolean(activeTabId && tab?.url?.startsWith('http'));
  if (!capturable || !activeTabId) {
    if (saveButton) saveButton.disabled = true;
    if (appliedButton) appliedButton.disabled = true;
    setStatus('Open a normal web page to capture a job.');
    return;
  }

  try {
    const [injection] = await chrome.scripting.executeScript<CapturedPage>({
      target: { tabId: activeTabId },
      func: captureActivePage
    });
    provisionalCapture = injection?.result;
    if (!provisionalCapture) throw new Error('No page data was returned.');

    if (detectedTitleNode) detectedTitleNode.textContent = provisionalCapture.publishedTitle;
    if (detectedCompanyNode) detectedCompanyNode.textContent = provisionalCapture.publishedCompanyName;
    if (detectedLocationNode) detectedLocationNode.textContent = provisionalCapture.observedLocationText ?? 'Not detected';
    if (saveButton) saveButton.disabled = false;
    if (appliedButton) appliedButton.disabled = false;
    setStatus('Review the detected details, then save.');
  } catch (error) {
    console.error('Application Trail page preview failed', error);
    if (saveButton) saveButton.disabled = true;
    if (appliedButton) appliedButton.disabled = true;
    setStatus(error instanceof Error ? error.message : 'Could not inspect this page.');
  }
}

async function capture(status: 'saved' | 'applied'): Promise<void> {
  if (!activeTabId) return;
  saveButton?.setAttribute('disabled', '');
  appliedButton?.setAttribute('disabled', '');
  setStatus('Capturing page...');

  try {
    let pageCapture = provisionalCapture;
    if (!pageCapture) {
      const [injection] = await chrome.scripting.executeScript<CapturedPage>({
        target: { tabId: activeTabId },
        func: captureActivePage
      });
      pageCapture = injection?.result;
    }
    if (!pageCapture) throw new Error('No page data was returned.');

    const userId = await getDevelopmentUserId();
    const response = await fetch(`${API_BASE_URL}/api/opportunities/capture`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-application-trail-user-id': userId
      },
      body: JSON.stringify({ ...pageCapture, status })
    });
    if (!response.ok) {
      throw new Error(`API returned HTTP ${response.status}.`);
    }

    const record = await response.json() as { opportunity?: { id?: string } };
    capturedOpportunityId = record.opportunity?.id;
    if (!capturedOpportunityId) throw new Error('API returned no opportunity ID.');

    if (openButton) openButton.hidden = false;
    setStatus(status === 'applied' ? 'Application captured.' : 'Job saved.');
  } catch (error) {
    console.error('Application Trail capture failed', error);
    setStatus(error instanceof Error ? error.message : 'Capture failed.');
  } finally {
    if (saveButton) saveButton.disabled = false;
    if (appliedButton) appliedButton.disabled = false;
  }
}

saveButton?.addEventListener('click', () => void capture('saved'));
appliedButton?.addEventListener('click', () => void capture('applied'));
openButton?.addEventListener('click', async () => {
  if (!capturedOpportunityId) return;
  const userId = await getDevelopmentUserId();
  const url = new URL(WEB_BASE_URL);
  url.searchParams.set('opportunityId', capturedOpportunityId);
  url.searchParams.set('devUserId', userId);
  await chrome.tabs.create({ url: url.toString() });
});

void loadActivePage();
