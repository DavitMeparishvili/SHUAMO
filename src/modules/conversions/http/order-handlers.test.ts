import { describe, expect, it, vi } from "vitest";
import { createOrderPatchHandler } from "./order-handlers";

function request(body: unknown = { action: "CONFIRM" }) {
  return new Request("https://xu.ge/api/brand/orders/cv1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ id: "cv1" }) };

describe("brand order PATCH", () => {
  it("uses only the authenticated brand and actor", async () => {
    const decide = vi.fn(async () => ({
      ok: true as const,
      value: { status: "CONFIRMED" as const },
    }));
    const handler = createOrderPatchHandler({
      currentViewer: async () => ({
        kind: "brand",
        userId: "u1",
        brandId: "b1",
        brandName: "Brand",
        isAdmin: false,
      }),
      decide,
    });
    expect((await handler(request(), context)).status).toBe(200);
    expect(decide).toHaveBeenCalledWith("b1", "u1", "cv1", "CONFIRM");
  });

  it("rejects unauthenticated, malformed and illegal requests", async () => {
    const anonymous = createOrderPatchHandler({
      currentViewer: async () => ({ kind: "anonymous" }),
      decide: vi.fn(),
    });
    expect((await anonymous(request(), context)).status).toBe(401);

    const authenticated = createOrderPatchHandler({
      currentViewer: async () => ({
        kind: "brand",
        userId: "u1",
        brandId: "b1",
        brandName: "Brand",
        isAdmin: false,
      }),
      decide: async () => ({ ok: false, error: "illegal_transition" }),
    });
    expect(
      (await authenticated(request({ action: "REOPEN" }), context)).status,
    ).toBe(400);
    expect((await authenticated(request(), context)).status).toBe(409);
  });
});
