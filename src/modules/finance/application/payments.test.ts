import { it, expect, vi } from "vitest";
import { recordPayment, reversePayment, issueInvoice } from "./commands";
import { FinanceOperationError } from "../domain/finance";
import type { Viewer } from "@/src/modules/identity";
const input = {
  requestKey: crypto.randomUUID(),
  party: { kind: "brand", id: crypto.randomUUID() },
  amount: "400",
  transferredOn: "2027-01-01",
  bankReference: "",
  note: "",
};
const repo = () => ({
  recordPayment: vi.fn().mockResolvedValue("id"),
  reversePayment: vi.fn(),
  issueInvoice: vi.fn(),
});
it.each<Viewer>([
  { kind: "anonymous" },
  { kind: "brand", userId: "u", brandId: "b", brandName: "b", isAdmin: false },
  {
    kind: "creator",
    userId: "u",
    creatorId: "c",
    displayName: "c",
    isAdmin: false,
  },
])("denies nonadmin commands before persistence %j", async (viewer) => {
  const r = repo();
  for (const command of [recordPayment(r), reversePayment(r), issueInvoice(r)])
    expect((await command(viewer, input)).ok).toBe(false);
  expect(r.recordPayment).not.toHaveBeenCalled();
  expect(r.reversePayment).not.toHaveBeenCalled();
  expect(r.issueInvoice).not.toHaveBeenCalled();
});
it.each<Viewer>([
  { kind: "admin", userId: "u" },
  { kind: "brand", userId: "u", brandId: "b", brandName: "b", isAdmin: true },
  {
    kind: "creator",
    userId: "u",
    creatorId: "c",
    displayName: "c",
    isAdmin: true,
  },
])("allows admin capability %j", async (viewer) => {
  const r = repo();
  expect(await recordPayment(r)(viewer, input)).toEqual({
    ok: true,
    value: { id: "id" },
  });
  expect(r.recordPayment).toHaveBeenCalledWith("u", {
    ...input,
    amount: "400.00",
  });
});
it("rejects numeric money and preserves unexpected failures", async () => {
  const r = repo(),
    viewer = { kind: "admin" as const, userId: "u" };
  expect(await recordPayment(r)(viewer, { ...input, amount: 400 })).toEqual({
    ok: false,
    error: "invalid_input",
  });
  r.recordPayment.mockRejectedValueOnce(
    new FinanceOperationError("retry_later"),
  );
  expect(await recordPayment(r)(viewer, input)).toEqual({
    ok: false,
    error: "retry_later",
  });
  r.recordPayment.mockRejectedValueOnce(new Error("db offline"));
  await expect(recordPayment(r)(viewer, input)).rejects.toThrow("db offline");
});
