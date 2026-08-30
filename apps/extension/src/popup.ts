import { captureActivePage, type CapturedPage } from './capture.js';

interface ExtensionConfig {
  serverOrigin: string;
  allowDevIdentity: boolean;
}

interface PendingGrant {
  grantId: string;
  grantSecret: string;
  expiresAt: string;
}

const titleNode = document.querySelector<HTMLElement>('#page-title');
const urlNode = document.querySelector<HTMLElement>('#page-url');
const detectedTitleNode = document.querySelector<HTMLElement>('#detected-title');
const detectedCompanyNode = document.querySelector<HTMLElement>('#detected-company');
const detectedLocationNode = document.querySelector<HTMLElement>('#detected-location');
const statusNode = document.querySelector<HTMLElement>('#capture-status');
const accountStatusNode = document.querySelector<HTMLElement>('#account-status');
const signInButton = document.querySelector<HTMLButtonElement>('#sign-in');
const saveButton = document.querySelector<HTMLButtonElement>('#save');
const appliedButton = document.querySelector<HTMLButtonElement>('#applied');
const openButton = document.querySelector<HTMLButtonElement>('#open-record');

let activeTabId: number | undefined;
let capturedOpportunityId: string | undefined;
let provisionalCapture: CapturedPage | undefined;
let config: ExtensionConfig;
let sessionToken: string | undefined;
let developmentUserId: string | undefined;
let pageCapturable = false;
let authenticated = false;

function setStatus(message: string): void {
  if (statusNode) statusNode.textContent = message;
}

function updateButtons(): void {
  const enabled = pageCapturable && authenticated;
  if (saveButton) saveButton.disabled = !enabled;
  if (appliedButton) appliedButton.disabled = !enabled;
}

async function loadConfig(): Promise<ExtensionConfig> {
  const response = await fetch(chrome.runtime.getURL('config.json'));
  const value = await response.json() as ExtensionConfig;
  return { serverOrigin: value.serverOrigin.replace(/\/$/, ''), allowDevIdentity: Boolean(value.allowDevIdentity) };
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

async function authHeaders(): Promise<Record<string, string>> {
  if (sessionToken) return { authorization: `Bearer ${sessionToken}` };
  if (config.allowDevIdentity) return { 'x-application-trail-user-id': await getDevelopmentUserId() };
  return {};
}

async function checkAuthentication(): Promise<boolean> {
  const saved = await chrome.storage.local.get('applicationTrailSessionToken');
  const token = saved.applicationTrailSessionToken;
  sessionToken = typeof token === 'string' ? token : undefined;
  if (sessionToken) {
    const response = await fetch(`${config.serverOrigin}/auth/me`, { headers: { authorization: `Bearer ${sessionToken}` } });
    if (response.ok) {
      const user = await response.json() as { displayName?: string; email?: string };
      authenticated = true;
      if (accountStatusNode) accountStatusNode.textContent = `Signed in as ${user.displayName ?? user.email ?? 'Google user'}.`;
      if (signInButton) signInButton.hidden = true;
      updateButtons();
      return true;
    }
    await chrome.storage.local.remove('applicationTrailSessionToken');
    sessionToken = undefined;
  }
  if (config.allowDevIdentity) {
    authenticated = true;
    if (accountStatusNode) accountStatusNode.textContent = 'Using explicitly enabled local development identity.';
    if (signInButton) signInButton.hidden = true;
    updateButtons();
    return true;
  }
  authenticated = false;
  if (accountStatusNode) accountStatusNode.textContent = 'Sign in to synchronize captures.';
  if (signInButton) signInButton.hidden = false;
  updateButtons();
  return false;
}

async function exchangePendingGrant(grant: PendingGrant): Promise<boolean> {
  if (new Date(grant.expiresAt).getTime() <= Date.now()) {
    await chrome.storage.local.remove('applicationTrailPendingGrant');
    return false;
  }
  const response = await fetch(`${config.serverOrigin}/auth/extension/exchange`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grantId: grant.grantId, grantSecret: grant.grantSecret })
  });
  if (response.status === 202) return false;
  if (!response.ok) {
    await chrome.storage.local.remove('applicationTrailPendingGrant');
    return false;
  }
  const result = await response.json() as { token?: string };
  if (!result.token) return false;
  await chrome.storage.local.set({ applicationTrailSessionToken: result.token });
  await chrome.storage.local.remove('applicationTrailPendingGrant');
  sessionToken = result.token;
  await checkAuthentication();
  setStatus('Signed in. Ready to capture.');
  return true;
}

async function resumePendingGrant(): Promise<void> {
  const saved = await chrome.storage.local.get('applicationTrailPendingGrant');
  const grant = saved.applicationTrailPendingGrant as PendingGrant | undefined;
  if (!grant?.grantId || !grant.grantSecret || !grant.expiresAt) return;
  if (await exchangePendingGrant(grant)) return;
  if (accountStatusNode) accountStatusNode.textContent = 'Finish Google sign-in in the opened tab, then return here.';
  let attempts = 0;
  const poll = async () => {
    attempts += 1;
    if (await exchangePendingGrant(grant)) return;
    if (attempts < 80) setTimeout(() => void poll(), 1500);
  };
  setTimeout(() => void poll(), 1000);
}

async function beginSignIn(): Promise<void> {
  if (signInButton) signInButton.disabled = true;
  try {
    const response = await fetch(`${config.serverOrigin}/auth/extension/start`, { method: 'POST' });
    if (!response.ok) throw new Error(`Sign-in start failed with HTTP ${response.status}.`);
    const grant = await response.json() as PendingGrant & { verificationUrl: string };
    await chrome.storage.local.set({ applicationTrailPendingGrant: {
      grantId: grant.grantId,
      grantSecret: grant.grantSecret,
      expiresAt: grant.expiresAt
    } });
    await chrome.tabs.create({ url: grant.verificationUrl });
    if (accountStatusNode) accountStatusNode.textContent = 'Finish Google sign-in in the opened tab.';
    await resumePendingGrant();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not start sign-in.');
  } finally {
    if (signInButton) signInButton.disabled = false;
  }
}

async function loadActivePage(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id;

  if (titleNode) titleNode.textContent = tab?.title ?? 'Untitled page';
  if (urlNode) urlNode.textContent = tab?.url ?? 'URL unavailable';

  pageCapturable = Boolean(activeTabId && tab?.url?.startsWith('http'));
  if (!pageCapturable || !activeTabId) {
    updateButtons();
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
    updateButtons();
    setStatus(authenticated ? 'Review the detected details, then save.' : 'Sign in before saving this capture.');
  } catch (error) {
    console.error('Application Trail page preview failed', error);
    pageCapturable = false;
    updateButtons();
    setStatus(error instanceof Error ? error.message : 'Could not inspect this page.');
  }
}

async function capture(status: 'saved' | 'applied'): Promise<void> {
  if (!activeTabId || !authenticated) return;
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

    const response = await fetch(`${config.serverOrigin}/api/opportunities/capture`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(await authHeaders())
      },
      body: JSON.stringify({ ...pageCapture, status })
    });
    if (response.status === 401) {
      authenticated = false;
      await chrome.storage.local.remove('applicationTrailSessionToken');
      sessionToken = undefined;
      await checkAuthentication();
      throw new Error('Your session expired. Sign in again.');
    }
    if (!response.ok) throw new Error(`API returned HTTP ${response.status}.`);

    const record = await response.json() as { opportunity?: { id?: string } };
    capturedOpportunityId = record.opportunity?.id;
    if (!capturedOpportunityId) throw new Error('API returned no opportunity ID.');

    if (openButton) openButton.hidden = false;
    setStatus(status === 'applied' ? 'Application captured.' : 'Job saved.');
  } catch (error) {
    console.error('Application Trail capture failed', error);
    setStatus(error instanceof Error ? error.message : 'Capture failed.');
  } finally {
    updateButtons();
  }
}

signInButton?.addEventListener('click', () => void beginSignIn());
saveButton?.addEventListener('click', () => void capture('saved'));
appliedButton?.addEventListener('click', () => void capture('applied'));
openButton?.addEventListener('click', async () => {
  if (!capturedOpportunityId) return;
  const url = new URL(config.serverOrigin);
  url.searchParams.set('opportunityId', capturedOpportunityId);
  await chrome.tabs.create({ url: url.toString() });
});

void (async () => {
  config = await loadConfig();
  await checkAuthentication();
  await resumePendingGrant();
  await loadActivePage();
})().catch(error => {
  console.error('Application Trail popup initialization failed', error);
  setStatus(error instanceof Error ? error.message : 'Could not initialize Application Trail.');
});
