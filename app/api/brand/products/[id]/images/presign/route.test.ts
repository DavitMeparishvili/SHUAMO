import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOwned: vi.fn(),
  presignPut: vi.fn(),
}));

vi.mock("@/src/config/env", () => ({
  serverEnv: () => ({
    STORAGE_ENDPOINT: "http://localhost:9000",
    STORAGE_PUBLIC_ENDPOINT: "http://localhost:9000",
    STORAGE_REGION: "us-east-1",
    STORAGE_BUCKET: "shuamo-product-images",
    STORAGE_ACCESS_KEY_ID: "key",
    STORAGE_SECRET_ACCESS_KEY: "secret",
  }),
}));

vi.mock("@/src/modules/identity", () => ({
  currentViewer: async () => ({ kind: "brand", brandId: "brand-owned" }),
  requireBrand: () => ({
    ok: true,
    value: { brandId: "brand-owned", brandName: "Owner" },
  }),
}));

vi.mock("@/src/modules/catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/modules/catalog")>()),
  prismaProductRepository: { findOwned: mocks.findOwned },
  createS3ImageStorage: () => ({ presignPut: mocks.presignPut }),
}));

import { POST } from "./route";

function request() {
  return new Request("http://localhost/api/presign", {
    method: "POST",
    body: JSON.stringify({ contentType: "image/jpeg" }),
  });
}

describe("product image presign route ownership", () => {
  beforeEach(() => {
    mocks.findOwned.mockReset();
    mocks.presignPut.mockReset();
    mocks.findOwned.mockImplementation(async (_brandId, productId) =>
      productId === "product-owned" ? { id: productId } : undefined,
    );
  });

  it.each(["new", "product-missing", "product-foreign"])(
    "denies %s before storage",
    async (id) => {
      const response = await POST(request(), {
        params: Promise.resolve({ id }),
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "not_found" });
      expect(mocks.findOwned).toHaveBeenCalledWith("brand-owned", id);
      expect(mocks.presignPut).not.toHaveBeenCalled();
    },
  );
});
