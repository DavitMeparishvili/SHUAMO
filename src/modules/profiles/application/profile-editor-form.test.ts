import { describe, expect, it } from "vitest";
import {
  creatorWorkRows,
  explicitSocialLinks,
  pairedLocalizedLines,
} from "./profile-editor-form";

describe("profile editor form parsing", () => {
  it("preserves independently edited bilingual rows", () => {
    expect(pairedLocalizedLines("ქართული\n", "English\nSecond")).toEqual([
      { ka: "ქართული", en: "English" },
      { ka: "", en: "Second" },
    ]);
  });

  it("keeps social platforms explicit", () => {
    const data = new FormData();
    data.append("socialPlatform", "website");
    data.append("socialUrl", "https://instagram.com.evil.example/name");
    expect(explicitSocialLinks(data)).toEqual([
      {
        platform: "website",
        url: "https://instagram.com.evil.example/name",
      },
    ]);
  });

  it("preserves ordered localized creator work", () => {
    const data = new FormData();
    for (const [name, value] of [
      ["workTitleKa", "პირველი"],
      ["workTitleEn", "First"],
      ["workUrl", "https://example.com/first"],
      ["workImageUrl", "/first.webp"],
      ["workTitleKa", "მეორე"],
      ["workTitleEn", "Second"],
      ["workUrl", "https://example.com/second"],
      ["workImageUrl", "/second.webp"],
    ] as const)
      data.append(name, value);
    expect(creatorWorkRows(data).map((work) => work.title.en)).toEqual([
      "First",
      "Second",
    ]);
  });
});
