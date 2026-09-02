import {
  publicationIssues,
  type BrandProfileInput,
  type CreatorProfileInput,
} from "../domain/profile-content";

export function setProfilePublication<
  T extends BrandProfileInput | CreatorProfileInput,
>(deps: {
  load(ownerId: string): Promise<T | undefined>;
  set(ownerId: string, status: "DRAFT" | "PUBLISHED"): Promise<void>;
}) {
  return async (ownerId: string, status: "DRAFT" | "PUBLISHED") => {
    const profile = await deps.load(ownerId);
    if (!profile) return { ok: false as const, error: "not_found" as const };
    if (status === "PUBLISHED") {
      const issues = publicationIssues(profile);
      if (issues.length)
        return { ok: false as const, error: "incomplete" as const, issues };
    }
    await deps.set(ownerId, status);
    return { ok: true as const };
  };
}
