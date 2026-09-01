/**
 * Caddy overwrites X-Real-IP after resolving trusted proxies. Deliberately do
 * not inspect X-Forwarded-For: that header may have come from the client.
 */
export function resolveClientIp(headers: Headers): string {
  const resolved = headers.get("x-real-ip")?.trim();
  return resolved === undefined || resolved.length === 0 ? "unknown" : resolved;
}
