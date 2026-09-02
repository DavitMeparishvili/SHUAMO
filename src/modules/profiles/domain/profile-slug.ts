export const RESERVED_PROFILE_SLUGS = new Set([
  "new",
  "profile",
  "settings",
  "api",
  "admin",
  "sign-in",
  "sign-up",
  "brands",
  "creators",
  "brand",
  "creator",
  "workspace",
  "help",
  "about",
]);

export function normalizeProfileSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isProfileSlug(value: string): boolean {
  return (
    value.length >= 3 &&
    value.length <= 50 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
    !RESERVED_PROFILE_SLUGS.has(value)
  );
}
