/**
 * Generates a shareable URL for a vacancy announcement draft.
 * Preserves window.location.origin and window.location.pathname
 * so GitHub Pages repository subpaths (e.g. /broadening-positions/) are preserved.
 */
export function getShareableDraftUrl(draftId: string): string {
  const origin = window.location.origin;
  let pathname = window.location.pathname;
  if (!pathname.endsWith('/')) {
    pathname += '/';
  }
  return `${origin}${pathname}?draftId=${draftId}`;
}

/**
 * Extracts draftId from various possible URL formats:
 * - ?draftId=xxx
 * - /?/draftId=xxx (from GitHub Pages 404 redirect)
 * - /#/?draftId=xxx or /#draftId=xxx
 */
export function extractDraftIdFromUrl(): string | null {
  // 1. Direct search parameter
  const searchParams = new URLSearchParams(window.location.search);
  let dId = searchParams.get("draftId");
  if (dId) return dId;

  // 2. Regex fallback on search string
  if (window.location.search) {
    const match = window.location.search.match(/draftId=([a-zA-Z0-9_\-]+)/);
    if (match) return match[1];
  }

  // 3. Hash routing string
  if (window.location.hash) {
    const match = window.location.hash.match(/draftId=([a-zA-Z0-9_\-]+)/);
    if (match) return match[1];
  }

  return null;
}
