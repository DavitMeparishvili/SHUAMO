import { describe, expect, it, vi } from "vitest";
import { createConversionsHandler } from "./conversions-handler";

const raw = JSON.stringify({
  orderId: "order",
  occurredAt: new Date().toISOString(),
  items: [{ sku: "SKU", qty: 1, unitPrice: "100.00", lineDiscount: "0.00" }],
});
function setup() {
  const record = vi.fn(async () => {});
  const intake = vi.fn(async () => ({ kind: "timestamp_invalid" as const }));
  const validate = vi.fn(async () => ({
    mode: "validation" as const,
    valid: true,
    outcome: "no_click" as const,
    commissionAmount: "0.00",
  }));
  const authenticate = vi.fn(async () => ({
    ok: true as const,
    value: { brandId: "brand", vatRegistered: false },
  }));
  return {
    record,
    intake,
    validate,
    authenticate,
    handler: createConversionsHandler({
      record,
      intake,
      validate,
      authenticate,
    }),
  };
}
const request = (body = raw, origin?: string) =>
  new Request("https://example.com/v1/conversions/validate", {
    method: "POST",
    headers: { authorization: "Bearer secret", ...(origin ? { origin } : {}) },
    body,
  });

describe("validation API safety and request metadata", () => {
  it.each([
    { qty: 2, unitPrice: "9999999999.99" },
    { qty: 2147483648, unitPrice: "0.00" },
  ])("rejects unpersistable line values before validation %#", async (item) => {
    const { handler, validate } = setup();
    const body = JSON.parse(raw);
    Object.assign(body.items[0], item);
    const response = await handler(request(JSON.stringify(body)));
    expect(response.status).toBe(422);
    expect(validate).not.toHaveBeenCalled();
  });
  it("never invokes live intake and records no secrets or payload fields", async () => {
    const { handler, intake, record } = setup();
    const response = await handler(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      mode: "validation",
      outcome: "no_click",
    });
    expect(intake).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith({
      id: response.headers.get("X-Request-Id"),
      brandId: "brand",
      mode: "validation",
      status: 200,
      outcome: "no_click",
    });
    expect(JSON.stringify(record.mock.calls)).not.toMatch(
      /secret|orderId|unitPrice/,
    );
  });
  it("rejects browser Origin on the public API before authentication", async () => {
    const { handler, authenticate, record } = setup();
    expect((await handler(request(raw, "https://example.com"))).status).toBe(
      401,
    );
    expect(authenticate).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });
  it("rejects oversized bodies even without Content-Length", async () => {
    const { handler, validate } = setup();
    expect((await handler(request(" ".repeat(262145)))).status).toBe(413);
    expect(validate).not.toHaveBeenCalled();
  });
  it("uses UTF-8 byte length for the body limit", async () => {
    const { handler } = setup();
    expect((await handler(request("ა".repeat(100000)))).status).toBe(413);
  });
  it("keeps the result when request logging fails", async () => {
    const { handler, record } = setup();
    record.mockRejectedValue(new Error("offline"));
    expect((await handler(request())).status).toBe(200);
  });
  it("returns a retryable error on validation database failure", async () => {
    const { handler, validate } = setup();
    validate.mockRejectedValue(new Error("offline"));
    const response = await handler(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "temporarily_unavailable" });
  });
});
