import { describe, expect, it } from "vitest";
import en from "./messages/en.json";
import ka from "./messages/ka.json";

// The product name is the one string that is identical in both catalogues.
// Transliterating a brand is worse than leaving it, so it is exempt from the
// Georgian-script assertion — and from nothing else.
const UNTRANSLATED_BY_DESIGN = new Set(["app.name"]);

describe("message catalogues", () => {
  it("have identical key sets", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ka).sort());
  });

  it("have no empty values", () => {
    for (const [key, value] of [...Object.entries(en), ...Object.entries(ka)]) {
      expect(value, `${key} is empty`).not.toBe("");
    }
  });

  it("never leave a value equal to its key", () => {
    for (const [key, value] of Object.entries(ka)) {
      expect(value, `${key} is untranslated`).not.toBe(key);
    }
  });

  it("write Georgian in Georgian script", () => {
    for (const [key, value] of Object.entries(ka)) {
      if (UNTRANSLATED_BY_DESIGN.has(key)) continue;

      expect(
        /[Ⴀ-ჿ]/.test(value),
        `${key} contains no Georgian characters`,
      ).toBe(true);
    }
  });

  it("exempts only keys that are actually present", () => {
    for (const key of UNTRANSLATED_BY_DESIGN) {
      expect(Object.keys(ka), `${key} is a stale exemption`).toContain(key);
    }
  });
});
