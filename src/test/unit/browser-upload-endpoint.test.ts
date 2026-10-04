import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/config/env", () => ({
  serverEnv: () => ({
    STORAGE_ENDPOINT: "http://minio:9000",
    STORAGE_PUBLIC_ENDPOINT: "https://s3.example.test",
    STORAGE_REGION: "us-east-1",
    STORAGE_BUCKET: "images",
    STORAGE_ACCESS_KEY_ID: "test-key",
    STORAGE_SECRET_ACCESS_KEY: "test-secret",
  }),
}));
vi.mock("@/src/modules/identity", () => ({
  currentViewer: async () => ({}),
  requireBrand: () => ({ ok: true, value: { brandId: "brand-1" } }),
  requireCreator: () => ({ ok: true, value: { creatorId: "creator-1" } }),
}));
vi.mock("@/src/infrastructure/product-upload-reservation", () => ({
  verifyProductReservation: () => "product-1",
}));
vi.mock("@/src/modules/catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/modules/catalog")>()),
  prismaProductRepository: {
    findOwned: async () => ({ id: "product-1" }),
  },
}));

import { POST as brand } from "@/app/api/brand/profile/media/presign/route";
import { POST as creator } from "@/app/api/creator/profile/media/presign/route";
import { POST as newProduct } from "@/app/api/brand/products/images/presign/route";
import { POST as existingProduct } from "@/app/api/brand/products/[id]/images/presign/route";

describe("browser upload destinations", () => {
  it.each([
    ["brand logo", brand, "brand-logo"],
    ["brand cover", brand, "brand-hero"],
    ["creator portrait", creator, "creator-hero"],
    ["creator work", creator, "creator-work"],
    ["new product", newProduct, ""],
    ["existing product", existingProduct, ""],
  ] as const)(
    "signs %s uploads for the public storage host",
    async (_, handler, kind) => {
      const response = await handler(
        new Request("https://example.test/api/presign", {
          method: "POST",
          body: JSON.stringify({
            kind,
            contentType: "image/png",
            reservation: "test",
          }),
        }),
        { params: Promise.resolve({ id: "product-1" }) },
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      const upload = new URL(body.uploadUrl);
      expect(upload.origin).toBe("https://s3.example.test");
      expect(upload.searchParams.has("X-Amz-Signature")).toBe(true);
      expect(new URL(body.publicUrl).origin).toBe(upload.origin);
    },
  );
});
