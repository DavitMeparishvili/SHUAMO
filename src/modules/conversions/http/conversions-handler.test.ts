import { describe, expect, it, vi } from "vitest";
import { Money } from "@/src/modules/shared";
import type { ConversionView } from "../ports/conversion-repository";
import { createConversionsHandler } from "./conversions-handler";

const view: ConversionView = {
  id: "cv1",
  orderId: "1234",
  occurredAt: "2026-08-12T10:22:00.000Z",
  status: "PENDING",
  confirmedAt: undefined,
  commissionAmount: "11.44",
  items: [
    {
      id: "ci1",
      sku: "P-9",
      qty: 1,
      unitPrice: "100.00",
      lineDiscount: "0.00",
      lineVat: "0.00",
      commissionableNet: "100.00",
      attribution: {
        clickId: "ck_a91f",
        creatorId: "c1",
        creatorName: "Nino",
        productId: "p1",
        commissionAmount: "11.44",
      },
    },
  ],
};

const raw = JSON.stringify({
  orderId: "1234",
  occurredAt: "2026-08-12T14:22:00+04:00",
  clickId: "ck_a91f",
  items: [{ sku: "P-9", qty: 1, unitPrice: "100.00", lineDiscount: "0.00" }],
});

function request(
  body = raw,
  options: { key?: string; origin?: string } = { key: "secret" },
) {
  const headers = new Headers();
  if (options.key !== undefined)
    headers.set("authorization", `Bearer ${options.key}`);
  if (options.origin !== undefined) headers.set("origin", options.origin);
  return new Request("https://xu.ge/v1/conversions", {
    method: "POST",
    headers,
    body,
  });
}

function setup(
  result:
    | {
        kind: "accepted" | "replay" | "unattributed";
        conversion: ConversionView;
      }
    | { kind: "conflict" }
    | { kind: "timestamp_invalid" } = {
    kind: "accepted",
    conversion: view,
  },
) {
  const intake = vi.fn(async () => result);
  const authenticate = vi.fn(async (key: string) =>
    key === "secret"
      ? ({
          ok: true,
          value: { brandId: "b1", vatRegistered: false },
        } as const)
      : ({ ok: false, error: "unknown_key" } as const),
  );
  const log = vi.fn();
  return {
    intake,
    authenticate,
    log,
    handler: createConversionsHandler({ authenticate, intake, log }),
  };
}

describe("POST /v1/conversions", () => {
  it.each([
    ["accepted", 200],
    ["replay", 200],
    ["unattributed", 200],
  ] as const)("returns %s as %s", async (kind, status) => {
    const { handler } = setup({
      kind,
      conversion:
        kind === "unattributed" ? { ...view, status: "UNATTRIBUTED" } : view,
    });
    expect((await handler(request())).status).toBe(status);
  });

  it("returns a byte-identical body for an accepted replay view", async () => {
    const { handler } = setup({ kind: "replay", conversion: view });
    const first = await handler(request());
    const second = await handler(request());
    expect(await first.text()).toBe(await second.text());
  });

  it("returns exact money as JSON strings and no sensitive click metadata", async () => {
    const { handler } = setup();
    const text = await (await handler(request())).text();
    expect(text).toContain('"commissionAmount":"11.44"');
    expect(text).not.toMatch(/"commissionAmount":\s*\d/);
    expect(text).not.toContain("fpHash");
    expect(text).not.toContain("visitorId");
    expect(text).not.toContain("xu_sk_");
    expect(Money.of("11.44").toStorageString()).toBe("11.44");
  });

  it("returns 400 for malformed JSON and 422 for an invalid shape", async () => {
    const { handler } = setup();
    expect((await handler(request("{bad"))).status).toBe(400);
    expect((await handler(request("{}"))).status).toBe(422);
  });

  it("returns 401 for missing and unknown credentials", async () => {
    const { handler } = setup();
    expect((await handler(request(raw, {}))).status).toBe(401);
    expect((await handler(request(raw, { key: "wrong" }))).status).toBe(401);
  });

  it("rejects browser Origin before authentication and logs the leak", async () => {
    const { handler, authenticate, log } = setup();
    const response = await handler(
      request(raw, { key: "secret", origin: "https://shop.example.ge" }),
    );
    expect(response.status).toBe(401);
    expect(authenticate).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ event: "probable_leaked_secret" }),
    );
  });

  it.each([
    [{ kind: "conflict" } as const, 409],
    [{ kind: "timestamp_invalid" } as const, 422],
  ])("maps intake failure %#", async (result, status) => {
    const { handler } = setup(result);
    expect((await handler(request())).status).toBe(status);
  });
});
