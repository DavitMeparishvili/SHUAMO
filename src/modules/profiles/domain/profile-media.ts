import type { Result } from "@/src/modules/shared";

export type ProfileMediaKind =
  "brand-logo" | "brand-hero" | "creator-hero" | "creator-work";
export type ProfileMediaContentType = "image/jpeg" | "image/png" | "image/webp";
const ext: Record<ProfileMediaContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export function profileMediaContentType(
  value: string,
): Result<ProfileMediaContentType, "unsupported_content_type"> {
  return value in ext
    ? { ok: true, value: value as ProfileMediaContentType }
    : { ok: false, error: "unsupported_content_type" };
}
export function buildProfileMediaKey(input: {
  role: "brands" | "creators";
  ownerId: string;
  kind: ProfileMediaKind;
  contentType: ProfileMediaContentType;
  uuid: string;
}) {
  return `profiles/${input.role}/${input.ownerId}/${input.kind}/${input.uuid}.${ext[input.contentType]}`;
}
export function profilePublicUrl(
  endpoint: string,
  bucket: string,
  key: string,
) {
  return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
}
export function validateProfileMediaUrl(input: {
  url: string;
  publicEndpoint: string;
  bucket: string;
  role: "brands" | "creators";
  ownerId: string;
  kinds: ProfileMediaKind[];
}): boolean {
  if (!input.url) return true;
  try {
    const url = new URL(input.url);
    const endpoint = new URL(input.publicEndpoint);
    const base = `${endpoint.pathname.replace(/\/$/, "")}/${encodeURIComponent(input.bucket)}/profiles/${input.role}/${encodeURIComponent(input.ownerId)}/`;
    if (
      url.origin !== endpoint.origin ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith(base)
    )
      return false;
    const rest = url.pathname.slice(base.length);
    const [kind, object, extra] = rest.split("/");
    return (
      !extra &&
      input.kinds.includes(kind as ProfileMediaKind) &&
      /^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(object ?? "")
    );
  } catch {
    return false;
  }
}
