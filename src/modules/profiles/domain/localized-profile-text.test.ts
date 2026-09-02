import { describe, expect, it } from "vitest";
import { resolveLocalizedText } from "./localized-profile-text";
describe("PROFILE-008 localized fallback", () => {
  it("labels English fallback on Georgian pages", () =>
    expect(resolveLocalizedText({ ka: "", en: "Hello" }, "ka")).toEqual({
      text: "Hello",
      fallbackFrom: "en",
    }));
  it("labels Georgian fallback on English pages", () =>
    expect(resolveLocalizedText({ ka: "გამარჯობა", en: "" }, "en")).toEqual({
      text: "გამარჯობა",
      fallbackFrom: "ka",
    }));
});
