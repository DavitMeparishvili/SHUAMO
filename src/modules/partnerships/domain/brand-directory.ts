export const APPLICATION_STATES = [
  "ALL",
  "APPROVED",
  "PENDING",
  "REJECTED",
  "NOT_APPLIED",
] as const;
export type ApplicationState = (typeof APPLICATION_STATES)[number];
export interface BrandDirectoryItem {
  id: string;
  name: string;
  tagline: string;
  location: string;
  locationKey: string;
  locationAliases: string[];
  imageUrl: string;
  profileHref: string | null;
  categories: string[];
  interests: { key: string; label: string }[];
  status: Exclude<ApplicationState, "ALL">;
  createdAt: string;
  appliedAt: string | null;
}
export interface BrandFilters {
  q: string;
  status: ApplicationState;
  categories: string[];
  location: string;
  interests: string[];
  sort: string;
}
export function readBrandFilters(
  params: Pick<URLSearchParams, "get" | "getAll">,
): BrandFilters {
  const status = params.get("status") ?? "ALL";
  return {
    q: params.get("q") ?? "",
    status: APPLICATION_STATES.includes(status as ApplicationState)
      ? (status as ApplicationState)
      : "ALL",
    categories: params.getAll("category"),
    location: params.get("location") ?? "",
    interests: params.getAll("interest"),
    sort: ["az", "za", "newest"].includes(params.get("sort") ?? "")
      ? params.get("sort")!
      : "az",
  };
}
export function filterBrands(
  items: BrandDirectoryItem[],
  filters: BrandFilters,
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
      (!filters.location ||
        item.locationAliases.some((location) =>
          location
            .toLocaleLowerCase()
            .includes(filters.location.toLocaleLowerCase()),
        )) &&
      (!filters.interests.length ||
        item.interests.some((i) => filters.interests.includes(i.key))),
  );
}
