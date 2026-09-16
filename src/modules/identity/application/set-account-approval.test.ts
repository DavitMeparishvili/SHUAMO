import { describe, expect, it, vi } from "vitest";
import { setAdminAccountApproval } from "./set-account-approval";
import type { AdminAccountApprovalRepository } from "../ports/account-repository";

const id = "00000000-0000-4000-8000-000000000001";

function setup() {
  const setStatus = vi.fn(async () => ({
    previousStatus: "PENDING" as const,
    status: "APPROVED" as const,
  }));
  const repository: AdminAccountApprovalRepository = { setStatus };
  return { setStatus, approve: setAdminAccountApproval(repository) };
}

describe("admin account approval", () => {
  it("rejects anonymous and non-admin viewers before persistence", async () => {
    const { approve, setStatus } = setup();
    expect(
      await approve(
        { kind: "anonymous" },
        { kind: "brand", id, status: "APPROVED" },
      ),
    ).toEqual({ ok: false, error: "unauthenticated" });
    expect(
      await approve(
        {
          kind: "creator",
          userId: id,
          creatorId: id,
          displayName: "Creator",
          isAdmin: false,
        },
        { kind: "creator", id, status: "APPROVED" },
      ),
    ).toEqual({ ok: false, error: "wrong_capability" });
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("accepts only valid account identifiers and lifecycle states", async () => {
    const { approve, setStatus } = setup();
    expect(
      await approve(
        { kind: "admin", userId: id },
        { kind: "brand", id: "bad-id", status: "PENDING" },
      ),
    ).toEqual({ ok: false, error: "invalid_input" });
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("passes the authenticated admin identity to persistence", async () => {
    const { approve, setStatus } = setup();
    await expect(
      approve(
        { kind: "admin", userId: id },
        { kind: "brand", id, status: "APPROVED" },
      ),
    ).resolves.toEqual({
      ok: true,
      value: { previousStatus: "PENDING", status: "APPROVED" },
    });
    expect(setStatus).toHaveBeenCalledWith({
      actorId: id,
      kind: "brand",
      id,
      status: "APPROVED",
    });
  });
});
