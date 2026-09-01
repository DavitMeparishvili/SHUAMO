import { describe, expect, it } from "vitest";
import { createBrandKeyPostHandler } from "./brand-key-handlers";

describe("brand key POST", () => {
  it("returns plaintext once without ever exposing keyHash", async () => {
    const response = await createBrandKeyPostHandler({
      currentViewer: async () => ({
        kind: "brand",
        userId: "u",
        brandId: "b",
        brandName: "Brand",
        isAdmin: false,
      }),
      generate: async () => ({
        ok: true,
        value: { plaintext: "xu_sk_plain", prefix: "xu_sk_prefix" },
      }),
    })();
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ plaintext: "xu_sk_plain", prefix: "xu_sk_prefix" });
    expect(JSON.stringify(body)).not.toContain("keyHash");
  });
  it("returns 403 to a creator", async () => {
    const response = await createBrandKeyPostHandler({
      currentViewer: async () => ({
        kind: "creator",
        userId: "u",
        creatorId: "c",
        displayName: "Nino",
        isAdmin: false,
      }),
      generate: async () => ({ ok: false, error: "not_found" }),
    })();
    expect(response.status).toBe(403);
  });
});
