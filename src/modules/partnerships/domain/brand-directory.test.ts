import { describe, expect, it } from "vitest";
import {
  filterBrands,
  readBrandFilters,
  type BrandDirectoryItem,
} from "./brand-directory";

const brand = (
  id: string,
  status: BrandDirectoryItem["status"],
  category: string,
  location: string,
): BrandDirectoryItem => ({
  id,
  name: id,
  status,
  categories: [category],
  location,
  locationKey: location,
  locationAliases: [
    location,
    location.startsWith("Tbilisi")
      ? "თბილისი, საქართველო"
      : "ბათუმი, საქართველო",
  ],
  tagline: "Natural products",
  imageUrl: "",
  profileHref: `/en/brands/${id}`,
  interests: [{ key: "story", label: "Product storytelling" }],
  createdAt: "2026-09-01T00:00:00Z",
  appliedAt: null,
});
const items = [
  brand("aroma", "APPROVED", "Beauty", "Tbilisi, Georgia"),
  brand("botanica", "NOT_APPLIED", "Beauty", "Batumi, Georgia"),
  brand("clay", "APPROVED", "Home & living", "Tbilisi, Georgia"),
  brand("mta", "PENDING", "Outdoors", "Tbilisi, Georgia"),
  brand("linen", "REJECTED", "Home & living", "Batumi, Georgia"),
];
describe("brand directory filters", () => {
  it("combines search, category OR choices, location, interests and application state", () => {
    const filters = readBrandFilters(
      new URLSearchParams(
        "q=natural&category=Beauty&category=Home+%26+living&location=Tbilisi%2C+Georgia&interest=story&status=APPROVED",
      ),
    );
    expect(filterBrands(items, filters).map((b) => b.id)).toEqual([
      "aroma",
      "clay",
    ]);
    expect(filterBrands(items, { ...filters, interests: ["video"] })).toEqual(
      [],
    );
  });
  it("keeps status counts independent of the selected status and applies secondary filters", () => {
    const filters = readBrandFilters(
      new URLSearchParams("category=Beauty&status=APPROVED"),
    );
    expect(filterBrands(items, filters).map((b) => b.id)).toEqual(["aroma"]);
    expect(filterBrands(items, filters, false).map((b) => b.id)).toEqual([
      "aroma",
      "botanica",
    ]);
  });
  it.each(["Tbilisi", "თბილისი"])(
    "retains legacy location search %s across locales",
    (location) => {
      expect(
        filterBrands(
          items,
          readBrandFilters(new URLSearchParams({ location })),
        ).map((b) => b.id),
      ).toEqual(["aroma", "clay", "mta"]);
    },
  );
  it.each(["APPROVED", "PENDING", "REJECTED", "NOT_APPLIED"])(
    "separates application state %s",
    (status) => {
      const result = filterBrands(
        items,
        readBrandFilters(new URLSearchParams({ status })),
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((b) => b.status === status)).toBe(true);
    },
  );
  it("defaults unknown statuses and sorts, and preserves unknown filters as an empty result", () => {
    const filters = readBrandFilters(
      new URLSearchParams("status=SUSPENDED&sort=unknown&category=missing"),
    );
    expect(filters.status).toBe("ALL");
    expect(filters.sort).toBe("az");
    expect(filterBrands(items, filters)).toEqual([]);
  });
});
