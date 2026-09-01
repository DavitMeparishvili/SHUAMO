import { describe, expect, it } from "vitest";
import { createImageUploadUrl } from "./create-image-upload-url";

const config = { publicEndpoint: "http://localhost:9000", bucket: "images" };
const random = { uuid: () => "fixed" };

describe("createImageUploadUrl", () => {
  it("rejects ownership and content type before storage", async () => {
    let called = false;
    const storage = {
      presignPut: async () => {
        called = true;
        return "url";
      },
    };
    expect(
      await createImageUploadUrl({
        products: { findOwned: async () => undefined },
        storage,
        random,
        config,
      })("b1", "p1", { contentType: "image/jpeg" }),
    ).toEqual({ ok: false, error: "not_found" });
    expect(called).toBe(false);
    expect(
      await createImageUploadUrl({
        products: { findOwned: async () => ({ id: "p1" }) },
        storage,
        random,
        config,
      })("b1", "p1", { contentType: "image/gif" }),
    ).toEqual({ ok: false, error: "unsupported_content_type" });
    expect(called).toBe(false);
  });
  it("returns matching signed and public URLs", async () => {
    const result = await createImageUploadUrl({
      products: { findOwned: async () => ({ id: "p1" }) },
      storage: { presignPut: async ({ key }) => `https://signed/${key}` },
      random,
      config,
    })("b1", "p1", { contentType: "image/jpeg" });
    expect(result).toEqual({
      ok: true,
      value: {
        uploadUrl: "https://signed/products/b1/p1/fixed.jpg",
        publicUrl: "http://localhost:9000/images/products/b1/p1/fixed.jpg",
      },
    });
  });
});
