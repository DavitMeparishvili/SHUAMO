import { describe, expect, it } from "vitest";
import { profileCompletionIssues } from "./profile-completion";

const complete = {
  slug: "demo",
  taglineKa: "გამარჯობა",
  descriptionEn: "About",
  categories: ["home"],
  heroImageUrl: "/image.png",
};
describe("profile publication checklist", () => {
  it("accepts content supplied in either language", () => {
    expect(
      profileCompletionIssues(
        {
          ...complete,
          socialLinks: [{ platform: "website", url: "https://example.test" }],
        },
        "creator",
      ),
    ).toEqual([]);
  });
  it("does not require optional brand logos or product creation", () => {
    expect(
      profileCompletionIssues(
        { ...complete, whatWeMake: [{ label: { en: "Services", ka: "" } }] },
        "brand",
      ),
    ).toEqual([]);
  });
  it("counts only owned active featured products as brand evidence", () => {
    expect(
      profileCompletionIssues(
        { ...complete, featuredProductIds: ["p1"] },
        "brand",
        ["p1"],
      ),
    ).toEqual([]);
    expect(
      profileCompletionIssues(
        { ...complete, featuredProductIds: ["p1"] },
        "brand",
        [],
      ),
    ).toEqual(["brandEvidence"]);
  });
  it("requires a social link or a complete work example for creators", () => {
    expect(profileCompletionIssues(complete, "creator")).toEqual([
      "creatorEvidence",
    ]);
    expect(
      profileCompletionIssues(
        {
          ...complete,
          featuredWork: [
            {
              title: { en: "Work", ka: "" },
              url: "https://example.test",
              imageUrl: "/work.png",
            },
          ],
        },
        "creator",
      ),
    ).toEqual([]);
  });
  it("does not count blank introductions as complete", () => {
    expect(
      profileCompletionIssues({ ...complete, taglineKa: "  " }, "creator"),
    ).toContain("tagline");
  });
  it("does not count an empty or incompatible social link as evidence", () => {
    for (const link of [
      { platform: "website", url: "" },
      { platform: "instagram", url: "https://facebook.com/example" },
    ]) {
      expect(
        profileCompletionIssues(
          { ...complete, socialLinks: [link] },
          "creator",
        ),
      ).toContain("creatorEvidence");
    }
  });
});
