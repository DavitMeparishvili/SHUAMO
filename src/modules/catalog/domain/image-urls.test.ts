import { describe, expect, it } from "vitest";
import { parseImageUrls } from "./image-urls";

describe("parseImageUrls", () => {
  it("accepts zero through eight secure URLs", () => {
    expect(parseImageUrls([])).toEqual({ ok: true, value: [] });
    const urls = Array.from({ length: 8 }, (_, i) => `https://cdn.ge/${i}.jpg`);
    expect(parseImageUrls(urls)).toEqual({ ok: true, value: urls });
  });
  it("rejects a ninth image and insecure URLs", () => {
    expect(
      parseImageUrls(
        Array.from({ length: 9 }, (_, i) => `https://cdn.ge/${i}.jpg`),
      ),
    ).toEqual({ ok: false, error: "too_many_images" });
    expect(parseImageUrls(["http://cdn.ge/a.jpg"])).toEqual({
      ok: false,
      error: "insecure_url",
    });
  });
});
