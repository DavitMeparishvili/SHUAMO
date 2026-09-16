import { describe, expect, it, vi } from "vitest";
import { createAdminAccountStatusHandler } from "./admin-account-status-handler";

const id = "00000000-0000-4000-8000-000000000001";
const request = (body: string) =>
  new Request(`http://localhost/api/admin/accounts/brand/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
const context = {
  params: Promise.resolve({ kind: "brand", id }),
};

describe("admin account status endpoint", () => {
  it("returns 401 and never writes for an unauthenticated request", async () => {
    const setStatus = vi.fn();
    const handler = createAdminAccountStatusHandler({
      viewer: async () => ({ kind: "anonymous" }),
      repository: { setStatus },
    });
    const response = await handler(
      request(JSON.stringify({ status: "APPROVED" })),
      context,
    );
    expect(response.status).toBe(401);
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("returns 403 and never writes for a signed-in non-admin", async () => {
    const setStatus = vi.fn();
    const handler = createAdminAccountStatusHandler({
      viewer: async () => ({
        kind: "brand",
        userId: id,
        brandId: id,
        brandName: "Brand",
        isAdmin: false,
      }),
      repository: { setStatus },
    });
    const response = await handler(
      request(JSON.stringify({ status: "SUSPENDED" })),
      context,
    );
    expect(response.status).toBe(403);
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and unsupported states", async () => {
    const setStatus = vi.fn();
    const handler = createAdminAccountStatusHandler({
      viewer: async () => ({ kind: "admin", userId: id }),
      repository: { setStatus },
    });
    expect((await handler(request("{"), context)).status).toBe(400);
    expect(
      (await handler(request(JSON.stringify({ status: "PENDING" })), context))
        .status,
    ).toBe(400);
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("uses the protected path identity even when the body tries to replace it", async () => {
    const setStatus = vi.fn(async () => ({
      previousStatus: "PENDING" as const,
      status: "APPROVED" as const,
    }));
    const handler = createAdminAccountStatusHandler({
      viewer: async () => ({ kind: "admin", userId: id }),
      repository: { setStatus },
    });
    const response = await handler(
      request(
        JSON.stringify({
          kind: "creator",
          id: "00000000-0000-4000-8000-000000000099",
          status: "APPROVED",
        }),
      ),
      context,
    );
    expect(response.status).toBe(200);
    expect(setStatus).toHaveBeenCalledWith({
      actorId: id,
      kind: "brand",
      id,
      status: "APPROVED",
    });
  });
});
