import { describe, expect, it, vi } from "vitest";
import { createRedirectHandler } from "./redirect-handler";

const context = { params: Promise.resolve({ code: "K7M2QPXZ" }) };

describe("redirect handler", () => {
  it("returns 302 with Location, hardened cookie and timing", async () => {
    const handler = createRedirectHandler({
      record: async () => ({
        kind: "redirect",
        location: "https://shop.ge/p/1?xu=ck_abc",
        setVisitorCookie: "11111111-1111-4111-8111-111111111111",
      }),
    });
    const response = await handler(
      new Request("https://xu.ge/r/K7M2QPXZ"),
      context,
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://shop.ge/p/1?xu=ck_abc",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "xu_vid=11111111-1111-4111-8111-111111111111",
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Lax");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=2592000");
    expect(response.headers.get("server-timing")).toMatch(
      /^total;dur=\d+\.\d{2}$/,
    );
    expect(response.headers.get("server-timing")).not.toContain("31.146");
    expect(response.headers.get("server-timing")).not.toContain("Mozilla");
  });

  it("passes the valid cookie and Caddy IP while ignoring X-Forwarded-For", async () => {
    const record = vi.fn(async () => ({
      kind: "redirect" as const,
      location: "https://shop.ge/p/1",
    }));
    const handler = createRedirectHandler({ record });
    await handler(
      new Request("https://xu.ge/r/K7M2QPXZ", {
        headers: {
          cookie: "xu_vid=11111111-1111-4111-8111-111111111111",
          "x-real-ip": "31.146.0.1",
          "x-forwarded-for": "attacker",
          "user-agent": "browser",
        },
      }),
      context,
    );
    expect(record).toHaveBeenCalledWith({
      code: "K7M2QPXZ",
      visitorId: "11111111-1111-4111-8111-111111111111",
      ip: "31.146.0.1",
      userAgent: "browser",
    });
  });

  it("does not set a cookie when none was requested", async () => {
    const response = await createRedirectHandler({
      record: async () => ({
        kind: "redirect",
        location: "https://shop.ge/p/1",
      }),
    })(new Request("https://xu.ge/r/X"), context);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("routes ended offers to the requested locale", async () => {
    const handler = createRedirectHandler({
      record: async () => ({
        kind: "offer-ended",
        reason: "PRODUCT_ARCHIVED",
      }),
    });
    const response = await handler(
      new Request("https://xu.ge/r/X", {
        headers: { "accept-language": "en-US,en;q=0.9" },
      }),
      context,
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "/en/offer-ended?reason=PRODUCT_ARCHIVED",
    );
  });

  it.each([
    ["ka;q=0.2, en;q=0.9", "/en/offer-ended?reason=LINK_DISABLED"],
    ["en;q=0, ka;q=0.5", "/ka/offer-ended?reason=LINK_DISABLED"],
    ["en;q=0, ka;q=0", "/ka/offer-ended?reason=LINK_DISABLED"],
    ["en-GB;q=0.7, ka-GE;q=0.8", "/ka/offer-ended?reason=LINK_DISABLED"],
  ])("honors Accept-Language weights in %s", async (accepted, location) => {
    const response = await createRedirectHandler({
      record: async () => ({
        kind: "offer-ended",
        reason: "LINK_DISABLED",
      }),
    })(
      new Request("https://xu.ge/r/X", {
        headers: { "accept-language": accepted },
      }),
      context,
    );
    expect(response.headers.get("location")).toBe(location);
  });

  it("returns 503 when link lookup is unavailable", async () => {
    const response = await createRedirectHandler({
      record: async () => ({ kind: "unavailable" }),
    })(new Request("https://xu.ge/r/X"), context);
    expect(response.status).toBe(503);
  });

  it("marks every outcome no-store", async () => {
    for (const outcome of [
      { kind: "redirect" as const, location: "https://shop.ge" },
      { kind: "offer-ended" as const, reason: "LINK_DISABLED" as const },
      { kind: "unavailable" as const },
    ]) {
      const response = await createRedirectHandler({
        record: async () => outcome,
      })(new Request("https://xu.ge/r/X"), context);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });
});
