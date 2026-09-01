import { describe, expect, it } from "vitest";
import { createPresignHandler } from "./image-upload-handlers";

const request = (body: unknown) =>
  new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify(body),
  });
const base = {
  products: { findOwned: async () => ({ id: "p1" }) },
  storage: {
    presignPut: async ({ key }: { key: string }) => `https://signed/${key}`,
  },
  random: { uuid: () => "fixed" },
  config: { publicEndpoint: "http://localhost:9000", bucket: "images" },
};

describe("presign handler", () => {
  it("returns 400 for a missing content type", async () => {
    expect(
      (
        await createPresignHandler(base)(request({}), {
          brandId: "b1",
          productId: "p1",
        })
      ).status,
    ).toBe(400);
  });
  it("maps ownership and content-type failures", async () => {
    expect(
      (
        await createPresignHandler({
          ...base,
          products: { findOwned: async () => undefined },
        })(request({ contentType: "image/jpeg" }), {
          brandId: "b1",
          productId: "p1",
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await createPresignHandler(base)(
          request({ contentType: "image/gif" }),
          { brandId: "b1", productId: "p1" },
        )
      ).status,
    ).toBe(422);
  });
  it("returns matching upload and public URLs", async () => {
    const response = await createPresignHandler(base)(
      request({ contentType: "image/jpeg" }),
      { brandId: "b1", productId: "p1" },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      uploadUrl: "https://signed/products/b1/p1/fixed.jpg",
      publicUrl: "http://localhost:9000/images/products/b1/p1/fixed.jpg",
    });
  });
});
