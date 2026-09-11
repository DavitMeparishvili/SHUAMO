import { describe, expect, it } from "vitest";
import {
  compareCreatorText,
  filterCreators,
  readCreatorFilters,
  type CreatorDirectoryItem,
} from "./creator-directory";

const creator = (
  id: string,
  status: CreatorDirectoryItem["status"],
  linkCount = 0,
  hasSale = false,
): CreatorDirectoryItem => ({
  id,
  name: id,
  status,
  linkCount,
  hasSale,
  tagline: "Lifestyle photography",
  categories: ["Lifestyle"],
  formats: ["Photography"],
  location: "Tbilisi",
  locationKey: "Tbilisi",
  imageUrl: "",
  profileHref: null,
  partnershipId: status === "NOT_PARTNERED" ? null : id,
  createdAt: "2026-09-01T00:00:00Z",
  appliedAt: null,
});
const items = [
  creator("Ana", "PENDING"),
  creator("Nino", "APPROVED", 2, true),
  creator("Dato", "REJECTED", 1),
  creator("Mari", "NOT_PARTNERED"),
];

describe("creator directory filters", () => {
  it("orders mixed Georgian and English labels consistently without runtime collation", () => {
    expect(
      ["მოდა", "Lifestyle", "City culture"].sort(compareCreatorText),
    ).toEqual(["City culture", "Lifestyle", "მოდა"]);
    expect(compareCreatorText("ana", "Ana")).toBe(0);
  });
  it("combines profile facets, search, and partnership status", () => {
    const filters = readCreatorFilters(
      new URLSearchParams(
        "q=PHOTO&category=Lifestyle&format=Photography&location=Tbilisi&status=APPROVED",
      ),
    );
    expect(filterCreators(items, filters).map((item) => item.id)).toEqual([
      "Nino",
    ]);
    expect(filterCreators(items, { ...filters, formats: ["Video"] })).toEqual(
      [],
    );
  });
  it("keeps tab counts independent of the current tab", () => {
    const filters = readCreatorFilters(
      new URLSearchParams("status=PENDING&category=Lifestyle"),
    );
    expect(filterCreators(items, filters)).toHaveLength(1);
    expect(filterCreators(items, filters, false)).toHaveLength(4);
  });
  it.each([
    ["no-link", ["Ana", "Mari"]],
    ["has-link", ["Nino", "Dato"]],
    ["has-sale", ["Nino"]],
  ])(
    "filters brand activity %s without conflating links and sales",
    (activation, ids) => {
      const filters = readCreatorFilters(
        new URLSearchParams(`activation=${activation}`),
      );
      expect(filterCreators(items, filters).map((item) => item.id)).toEqual(
        ids,
      );
    },
  );
  it("supports the invitation tab and falls back from invalid query values", () => {
    expect(
      filterCreators(
        items,
        readCreatorFilters(new URLSearchParams("status=NOT_PARTNERED")),
      ).map((item) => item.id),
    ).toEqual(["Mari"]);
    const filters = readCreatorFilters(
      new URLSearchParams("status=unknown&activation=unknown&sort=unknown"),
    );
    expect(filters).toMatchObject({
      status: "ALL",
      activation: "",
      sort: "az",
    });
    expect(filterCreators(items, filters)).toHaveLength(4);
  });
});
