import { describe, expect, it } from "vitest";
import { createDecisionHandler } from "./partnership-handlers";

describe("partnership decision handler", () => {
  it("validates the decision and returns the mint count", async () => {
    const handler = createDecisionHandler(async () => ({
      ok: true,
      value: { mintedLinks: 3 },
    }));
    const response = await handler(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ decision: "APPROVE" }),
      }),
      { brandId: "b1", partnershipId: "pt1" },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ mintedLinks: 3 });
  });
  it("rejects an invalid decision", async () => {
    const handler = createDecisionHandler(async () => ({
      ok: true,
      value: { mintedLinks: 0 },
    }));
    const response = await handler(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ decision: "DELETE" }),
      }),
      { brandId: "b1", partnershipId: "pt1" },
    );
    expect(response.status).toBe(400);
  });
});
