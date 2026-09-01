import { describe, expect, it, vi } from "vitest";
import type { ClickRepository } from "../ports/click-repository";
import type { LinkLookup, LinkSnapshot } from "../ports/link-lookup";
import { recordClick, type RecordClickDeps } from "./record-click";

const NOW = new Date("2026-08-12T12:00:00Z");
const VISITOR_ID = "11111111-1111-4111-8111-111111111111";

const liveSnapshot: LinkSnapshot = {
  linkId: "11111111-1111-4111-8111-111111111111",
  brandId: "22222222-2222-4222-8222-222222222222",
  backlinkUrl: "https://aromashop.ge/p/perfume-100",
  state: {
    brandStatus: "APPROVED",
    partnershipStatus: "APPROVED",
    productStatus: "ACTIVE",
    linkStatus: "ACTIVE",
  },
};

function setup(
  overrides: {
    links?: LinkLookup;
    clicks?: ClickRepository;
  } = {},
) {
  const insert = vi.fn<ClickRepository["insert"]>(async () => undefined);
  const links: LinkLookup = overrides.links ?? {
    byCode: async () => liveSnapshot,
  };
  const clicks: ClickRepository = overrides.clicks ?? {
    findPriorByVisitor: async () => undefined,
    findPriorByFingerprint: async () => undefined,
    insert,
  };
  const deps: RecordClickDeps = {
    links,
    clicks,
    clock: { now: () => NOW },
    random: { bytes: (count) => new Uint8Array(count).fill(4) },
    secret: "0".repeat(40),
  };
  return { deps, insert };
}

const request = {
  code: "K7M2QPXZ",
  visitorId: VISITOR_ID,
  ip: "31.146.0.1",
  userAgent: "Mozilla/5.0",
};

describe("recordClick", () => {
  it("commits a private click row before returning a redirect with its id", async () => {
    const { deps, insert } = setup();
    const outcome = await recordClick(deps)(request);
    expect(outcome.kind).toBe("redirect");
    expect(outcome.kind === "redirect" && outcome.location).toMatch(
      /^https:\/\/aromashop\.ge\/p\/perfume-100\?xu=ck_/,
    );
    expect(insert).toHaveBeenCalledOnce();
    const written = insert.mock.calls[0]?.[0];
    expect(written).toMatchObject({
      trackingLinkId: liveSnapshot.linkId,
      brandId: liveSnapshot.brandId,
      visitorId: VISITOR_ID,
      creditable: true,
    });
    expect(written?.fpHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(written)).not.toContain(request.ip);
    expect(JSON.stringify(written)).not.toContain(request.userAgent);
  });

  it("mints a future visitor cookie but keeps the current no-cookie click anonymous", async () => {
    const { deps, insert } = setup();
    const outcome = await recordClick(deps)({
      ...request,
      visitorId: undefined,
    });
    expect(outcome.kind === "redirect" && outcome.setVisitorCookie).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    expect(insert.mock.calls[0]?.[0].visitorId).toBeUndefined();
  });

  it("reuses a presented visitor cookie and does not mint another", async () => {
    const outcome = await recordClick(setup().deps)(request);
    expect(
      outcome.kind === "redirect" && outcome.setVisitorCookie,
    ).toBeUndefined();
  });

  it("marks a same-link visitor repeat inside thirty minutes non-creditable", async () => {
    const insert = vi.fn<ClickRepository["insert"]>(async () => undefined);
    const { deps } = setup({
      clicks: {
        findPriorByVisitor: async () => new Date(NOW.getTime() - 60_000),
        findPriorByFingerprint: async () => undefined,
        insert,
      },
    });
    await recordClick(deps)(request);
    expect(insert.mock.calls[0]?.[0].creditable).toBe(false);
  });

  it("consults the fingerprint only when no cookie was presented", async () => {
    const byVisitor = vi.fn(async () => undefined);
    const byFingerprint = vi.fn(async () => undefined);
    const clicks: ClickRepository = {
      findPriorByVisitor: byVisitor,
      findPriorByFingerprint: byFingerprint,
      insert: async () => undefined,
    };
    const { deps } = setup({ clicks });

    await recordClick(deps)(request);
    expect(byVisitor).toHaveBeenCalledOnce();
    expect(byFingerprint).not.toHaveBeenCalled();

    await recordClick(deps)({ ...request, visitorId: undefined });
    expect(byFingerprint).toHaveBeenCalledOnce();
  });

  it("uses the adapter's one-statement dedup insert fast path when available", async () => {
    const findPriorByVisitor = vi.fn(async () => undefined);
    const findPriorByFingerprint = vi.fn(async () => undefined);
    const insert = vi.fn<ClickRepository["insert"]>(async () => undefined);
    const insertDeduplicated = vi.fn<
      NonNullable<ClickRepository["insertDeduplicated"]>
    >(async () => undefined);
    const { deps } = setup({
      clicks: {
        findPriorByVisitor,
        findPriorByFingerprint,
        insert,
        insertDeduplicated,
      },
    });
    await recordClick(deps)(request);
    expect(insertDeduplicated).toHaveBeenCalledOnce();
    expect(insertDeduplicated.mock.calls[0]?.[1]).toMatchObject({
      kind: "visitor",
      value: VISITOR_ID,
    });
    expect(findPriorByVisitor).not.toHaveBeenCalled();
    expect(findPriorByFingerprint).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("still gives a fingerprint-deduplicated click an xu id", async () => {
    const insert = vi.fn<ClickRepository["insert"]>(async () => undefined);
    const { deps } = setup({
      clicks: {
        findPriorByVisitor: async () => undefined,
        findPriorByFingerprint: async () => new Date(NOW.getTime() - 60_000),
        insert,
      },
    });
    const outcome = await recordClick(deps)({
      ...request,
      visitorId: undefined,
    });
    expect(outcome.kind === "redirect" && outcome.location).toContain(
      "?xu=ck_",
    );
    expect(insert.mock.calls[0]?.[0].creditable).toBe(false);
  });

  it.each([
    ["BRAND_DISABLED", { brandStatus: "SUSPENDED" as const }],
    ["CREATOR_REMOVED", { partnershipStatus: "REJECTED" as const }],
    ["PRODUCT_ARCHIVED", { productStatus: "ARCHIVED" as const }],
    ["LINK_DISABLED", { linkStatus: "DISABLED" as const }],
  ])("stops the disable chain at %s without writing", async (reason, state) => {
    const links: LinkLookup = {
      byCode: async () => ({
        ...liveSnapshot,
        state: { ...liveSnapshot.state, ...state },
      }),
    };
    const { deps, insert } = setup({ links });
    await expect(recordClick(deps)(request)).resolves.toEqual({
      kind: "offer-ended",
      reason,
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("redirects without xu when the dedup query or insert fails", async () => {
    for (const clicks of [
      {
        findPriorByVisitor: async () => {
          throw new Error("connection terminated");
        },
        findPriorByFingerprint: async () => undefined,
        insert: async () => undefined,
      },
      {
        findPriorByVisitor: async () => undefined,
        findPriorByFingerprint: async () => undefined,
        insert: async () => {
          throw new Error("connection terminated");
        },
      },
    ] satisfies ClickRepository[]) {
      await expect(
        recordClick(setup({ clicks }).deps)(request),
      ).resolves.toEqual({
        kind: "redirect",
        location: liveSnapshot.backlinkUrl,
      });
    }
  });

  it("reports lookup failure as unavailable and unknown codes as ended", async () => {
    await expect(
      recordClick(
        setup({
          links: {
            byCode: async () => {
              throw new Error("connection terminated");
            },
          },
        }).deps,
      )(request),
    ).resolves.toEqual({ kind: "unavailable" });
    await expect(
      recordClick(setup({ links: { byCode: async () => undefined } }).deps)(
        request,
      ),
    ).resolves.toEqual({ kind: "offer-ended", reason: "LINK_DISABLED" });
  });
});
