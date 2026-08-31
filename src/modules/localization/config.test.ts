import { describe, expect, it } from "vitest";
import { LOCALES, isLocale } from "./config";

describe("locales", () => {
  it("ships exactly ka and en", () => {
    expect([...LOCALES]).toEqual(["ka", "en"]);
  });

  it("accepts a supported locale", () => {
    expect(isLocale("ka")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isLocale("ru")).toBe(false);
    expect(isLocale("EN")).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});
