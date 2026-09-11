export const CREATOR_STATES = [
  "ALL",
  "APPROVED",
  "PENDING",
  "REJECTED",
  "NOT_PARTNERED",
] as const;
export type CreatorState = (typeof CREATOR_STATES)[number];
// Browser and server ICU builds can disagree on Georgian collation. Keep
// mixed-script directory ordering identical during SSR and hydration.
export function compareCreatorText(a: string, b: string) {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  return left === right ? 0 : left < right ? -1 : 1;
}
export interface CreatorDirectoryItem {
  id: string;
  name: string;
  tagline: string;
  location: string;
  locationKey: string;
  imageUrl: string;
  profileHref: string | null;
  categories: string[];
  formats: string[];
  status: Exclude<CreatorState, "ALL">;
  partnershipId: string | null;
  createdAt: string;
  appliedAt: string | null;
  linkCount: number;
  hasSale: boolean;
}
export interface CreatorFilters {
  q: string;
  status: CreatorState;
  categories: string[];
  location: string;
  formats: string[];
  activation: string;
  sort: string;
}
export function readCreatorFilters(
  params: Pick<URLSearchParams, "get" | "getAll">,
): CreatorFilters {
  const status = params.get("status") ?? "ALL";
  return {
    q: params.get("q") ?? "",
    status: CREATOR_STATES.includes(status as CreatorState)
      ? (status as CreatorState)
      : "ALL",
    categories: params.getAll("category"),
    location: params.get("location") ?? "",
    formats: params.getAll("format"),
    activation: ["no-link", "has-link", "has-sale"].includes(
      params.get("activation") ?? "",
    )
      ? params.get("activation")!
      : "",
    sort: ["az", "za", "newest"].includes(params.get("sort") ?? "")
      ? params.get("sort")!
      : "az",
  };
}
export function filterCreators(
  items: CreatorDirectoryItem[],
  filters: CreatorFilters,
  includeStatus = true,
) {
  const q = filters.q.trim().toLocaleLowerCase();
  return items.filter(
    (item) =>
      (!q || `${item.name} ${item.tagline}`.toLocaleLowerCase().includes(q)) &&
      (!includeStatus ||
        filters.status === "ALL" ||
        item.status === filters.status) &&
      (!filters.categories.length ||
        item.categories.some((c) => filters.categories.includes(c))) &&
      (!filters.location || item.locationKey === filters.location) &&
      (!filters.formats.length ||
        item.formats.some((f) => filters.formats.includes(f))) &&
      (!filters.activation ||
        (filters.activation === "no-link"
          ? item.linkCount === 0
          : filters.activation === "has-link"
            ? item.linkCount > 0
            : item.hasSale)),
  );
}
