export interface CapturedPage {
  sourceSite: string;
  sourceUrl: string;
  pageTitle: string;
  sourceText: string;
  publishedTitle: string;
  publishedCompanyName: string;
  externalJobId?: string;
  observedLocationText?: string;
  structuredMetadata?: Record<string, unknown>;
}

export function captureActivePage(): CapturedPage {
  function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  function findJobPosting(value: unknown): Record<string, unknown> | null {
    if (Array.isArray(value)) {
      for (const item of value) {
        const match = findJobPosting(item);
        if (match) return match;
      }
      return null;
    }

    const record = asRecord(value);
    if (!record) return null;
    const type = record['@type'];
    if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
      return record;
    }

    const graph = record['@graph'];
    if (graph) return findJobPosting(graph);
    return null;
  }

  function stringValue(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  function jobIdentifier(job: Record<string, unknown> | null): string | undefined {
    if (!job) return undefined;
    const identifier = job.identifier;
    const direct = stringValue(identifier);
    if (direct) return direct;
    const record = asRecord(identifier);
    return stringValue(record?.value) ?? stringValue(record?.name);
  }

  function companyName(job: Record<string, unknown> | null): string | undefined {
    const organization = asRecord(job?.hiringOrganization);
    return stringValue(organization?.name);
  }

  function locationText(job: Record<string, unknown> | null): string | undefined {
    const locations = Array.isArray(job?.jobLocation) ? job?.jobLocation : [job?.jobLocation];
    for (const location of locations) {
      const locationRecord = asRecord(location);
      const address = asRecord(locationRecord?.address);
      const parts = [
        stringValue(address?.addressLocality),
        stringValue(address?.addressRegion),
        stringValue(address?.addressCountry)
      ].filter(Boolean);
      if (parts.length) return parts.join(', ');
    }
    return stringValue(job?.jobLocationType);
  }

  let jobPosting: Record<string, unknown> | null = null;
  for (const script of Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'))) {
    try {
      const parsed = JSON.parse(script.textContent ?? '');
      jobPosting = findJobPosting(parsed);
      if (jobPosting) break;
    } catch {
      // Invalid third-party JSON-LD should not prevent capture.
    }
  }

  const contentRoot = document.querySelector<HTMLElement>('main')
    ?? document.querySelector<HTMLElement>('[role="main"]')
    ?? document.querySelector<HTMLElement>('article')
    ?? document.body;
  const sourceText = contentRoot?.innerText?.trim() ?? '';
  const hostname = window.location.hostname || 'unknown-source';
  const externalJobId = jobIdentifier(jobPosting);
  const observedLocationText = locationText(jobPosting);

  return {
    sourceSite: hostname,
    sourceUrl: window.location.href,
    pageTitle: document.title,
    sourceText,
    publishedTitle: stringValue(jobPosting?.title) ?? (document.title || 'Untitled job'),
    publishedCompanyName: companyName(jobPosting) ?? hostname,
    ...(externalJobId ? { externalJobId } : {}),
    ...(observedLocationText ? { observedLocationText } : {}),
    ...(jobPosting ? { structuredMetadata: { jobPosting } } : {})
  };
}
