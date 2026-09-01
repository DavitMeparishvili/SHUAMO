export const VISITOR_COOKIE = {
  name: "xu_vid",
  maxAgeSeconds: 30 * 24 * 60 * 60,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: true,
} as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readVisitorCookie(headers: Headers): string | undefined {
  const cookie = headers.get("cookie");
  if (cookie === null) return undefined;

  for (const part of cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== VISITOR_COOKIE.name) continue;
    let value: string;
    try {
      value = decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
    return UUID_PATTERN.test(value) ? value : undefined;
  }
  return undefined;
}

export function serializeVisitorCookie(visitorId: string): string {
  return [
    `${VISITOR_COOKIE.name}=${encodeURIComponent(visitorId)}`,
    "Path=/",
    `Max-Age=${VISITOR_COOKIE.maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
  ].join("; ");
}
