const titleNode = document.querySelector<HTMLElement>('#page-title');
const urlNode = document.querySelector<HTMLElement>('#page-url');

async function loadActivePage(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (titleNode) titleNode.textContent = tab?.title ?? 'Untitled page';
  if (urlNode) urlNode.textContent = tab?.url ?? 'URL unavailable';
}

void loadActivePage();
