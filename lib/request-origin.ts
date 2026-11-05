function originOnly(value: string): string {
  const url = new URL(value.trim());
  if (!['https:', 'http:'].includes(url.protocol) || url.username ||
      url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Invalid origin format');
  }
  return url.origin;
}

export function publicOrigin(request: Request): string {
  return originOnly(process.env.APP_ORIGIN || new URL(request.url).origin);
}

export function trustedSameOrigin(request: Request): boolean {
  const supplied = request.headers.get('origin');
  try {
    const expected = publicOrigin(request);
    if (!supplied || originOnly(supplied) === expected) return true;
    console.warn('FS_ORIGIN_MISMATCH', JSON.stringify({
      configured: process.env.APP_ORIGIN || '(missing)',
      expected,
      received: supplied.slice(0, 300),
      serverOrigin: new URL(request.url).origin,
      fetchSite: request.headers.get('sec-fetch-site'),
    }));
  } catch {
    console.warn('FS_ORIGIN_INVALID', JSON.stringify({
      configured: process.env.APP_ORIGIN || '(missing)',
      received: supplied?.slice(0, 300),
    }));
  }
  return false;
}
