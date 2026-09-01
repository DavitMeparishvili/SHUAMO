export function appendClickId(backlinkUrl: string, clickId: string): string {
  const url = new URL(backlinkUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new TypeError(`backlink must be http(s), received "${url.protocol}"`);
  }
  url.searchParams.set("xu", clickId);
  return url.toString();
}
