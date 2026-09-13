import { it, expect } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { financeFixture } from "@/src/test/fixtures/finance";
import { seedBrand } from "@/src/test/fixtures/accounts";
import { persistPayment, persistReversal } from "./prisma-payment-repository";
import { persistInvoice } from "./prisma-invoice-repository";
import { prismaFinanceReads as reads } from "./prisma-finance-reads";
import {
  readFinanceInvoice,
  readOwnFinance,
} from "../application/read-finance";
import { prismaAdminPerformanceFinance } from "./prisma-admin-performance-finance";
const payment = (
  id: string,
  kind: "brand" | "creator" = "brand",
  amount = "200.00",
) => ({
  requestKey: crypto.randomUUID(),
  party: { kind, id },
  amount,
  transferredOn: "2026-08-31",
  bankReference: "SAME-REF",
  note: "Visible note",
});

it("finds an old original on its own history page and ignores foreign record IDs", async () => {
  const f = await financeFixture(), party = { kind: "brand" as const, id: f.brand.id };
  const original = await persistPayment(f.admin.id, payment(f.brand.id));
  await prisma.financePayment.createMany({ data: Array.from({ length: 26 }, () => ({ requestKey: crypto.randomUUID(), requestHash: "a".repeat(64), kind: "PAYMENT" as const, brandId: f.brand.id, amount: "1", transferredOn: new Date("2026-09-13"), partySnapshot: { name: f.brand.name }, recordedById: f.admin.id })) });
  const found = await reads.getAccount(party, { page: 1, record: original });
  expect(found?.payments.page).toBe(2);
  expect(found?.payments.items.some(row => row.id === original)).toBe(true);
  const other = await seedBrand();
  const foreign = await reads.getAccount({ kind: "brand", id: other.id }, { page: 1, record: original });
  expect(foreign?.payments.items).toEqual([]);
});

it("rolls back the payment if its audit cannot be written", async () => {
  const f = await financeFixture();
  await prisma.$executeRawUnsafe(`CREATE FUNCTION finance_test_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='finance.payment_recorded' THEN RAISE EXCEPTION 'audit unavailable'; END IF; RETURN NEW; END $$`);
  try {
    await prisma.$executeRawUnsafe(`CREATE TRIGGER finance_test_audit BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION finance_test_reject_audit()`);
    await expect(persistPayment(f.admin.id, payment(f.brand.id))).rejects.toThrow();
    expect(await prisma.financePayment.count()).toBe(0);
  } finally {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS finance_test_audit ON audit_event`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION finance_test_reject_audit()`);
  }
});
it("records the complete independent finance journey with stable invoices", async () => {
  const f = await financeFixture(),
    brand = { kind: "brand" as const, id: f.brand.id },
    creator = { kind: "creator" as const, id: f.creator.id };
  const snapshots = [];
  for (const party of [brand, creator]) {
    const p = await reads.previewInvoice(party);
    expect(p.total).toBe("300.00");
    const id = await persistInvoice(f.admin.id, {
      requestKey: crypto.randomUUID(),
      party,
      previewHash: p.previewHash,
      payer: p.payer,
      payee: p.payee,
    });
    snapshots.push(await reads.getInvoice(id));
    expect((await reads.getSummary(party))?.balance.outstanding).toBe("300.00");
    expect((await reads.previewInvoice(party)).lines).toEqual([]);
  }
  await persistPayment(f.admin.id, payment(f.creator.id, "creator"));
  expect((await reads.getSummary(creator))?.balance.outstanding).toBe("100.00");
  const receipt = await persistPayment(
    f.admin.id,
    payment(f.brand.id, "brand", "100.00"),
  );
  expect((await reads.getSummary(brand))?.balance.outstanding).toBe("200.00");
  const reversal = {
    requestKey: crypto.randomUUID(),
    paymentId: receipt,
    reason: "Wrong amount",
  };
  const results = await Promise.all([
    persistReversal(f.admin.id, reversal),
    persistReversal(f.admin.id, {
      ...reversal,
      requestKey: crypto.randomUUID(),
    }),
  ]);
  expect(results[0]).toBe(results[1]);
  expect((await reads.getSummary(brand))?.balance.outstanding).toBe("300.00");
  await persistPayment(f.admin.id, payment(f.brand.id, "brand", "350.00"));
  await persistPayment(f.admin.id, payment(f.creator.id, "creator", "150.00"));
  for (const party of [brand, creator])
    expect((await reads.getSummary(party))?.balance).toEqual({
      earned: "300.00",
      payments: "350.00",
      outstanding: "-50.00",
    });
  for (const snapshot of snapshots)
    expect(await reads.getInvoice(snapshot!.id)).toEqual(snapshot);
  const history = (await reads.getSummary(brand))!.payments.items;
  expect(history.find((p) => p.id === receipt)?.reversed).toBe(true);
  expect(history.filter((p) => p.kind === "REVERSAL")).toHaveLength(1);
  const finance = await prismaAdminPerformanceFinance({
    from: "2026-08-01",
    to: "2026-08-31",
    brandIds: [f.brand.id],
    creatorIds: [f.creator.id],
  });
  expect(finance.period.brandReceipts).toBe("350.00");
  expect(finance.current.brandCredits).toBe("50.00");
  expect(finance.current.brandOutstanding).toBe("0.00");
});
it("makes duplicate payments idempotent, distinct keys independent, mismatched replay a conflict", async () => {
  const f = await financeFixture(),
    input = payment(f.brand.id);
  const results = await Promise.all([
    persistPayment(f.admin.id, input),
    persistPayment(f.admin.id, input),
  ]);
  expect(results[0]).toBe(results[1]);
  expect(await prisma.financePayment.count()).toBe(1);
  await expect(
    persistPayment(f.admin.id, { ...input, amount: "201.00" }),
  ).rejects.toThrow("request_conflict");
  await persistPayment(f.admin.id, {
    ...input,
    requestKey: crypto.randomUUID(),
  });
  expect((await reads.getSummary(input.party))?.balance.outstanding).toBe(
    "-100.00",
  );
});
it("allows prepayments for suspended zero-earning accounts and only same-owner invoice metadata", async () => {
  const f = await financeFixture(),
    other = await seedBrand({ status: "SUSPENDED" });
  await persistPayment(f.admin.id, payment(other.id));
  expect(
    (await reads.getSummary({ kind: "brand", id: other.id }))?.balance
      .outstanding,
  ).toBe("-200.00");
  const p = await reads.previewInvoice({ kind: "brand", id: f.brand.id });
  const invoiceId = await persistInvoice(f.admin.id, {
    ...p,
    requestKey: crypto.randomUUID(),
  });
  await expect(
    persistPayment(f.admin.id, { ...payment(other.id), invoiceId }),
  ).rejects.toThrow("invoice_party_mismatch");
  await persistPayment(f.admin.id, { ...payment(f.brand.id), invoiceId });
});
it("keeps payments out of preview hashes and creates cancellation corrections once", async () => {
  const f = await financeFixture(),
    party = { kind: "creator" as const, id: f.creator.id },
    p = await reads.previewInvoice(party);
  await persistPayment(f.admin.id, payment(f.creator.id, "creator", "400.00"));
  expect((await reads.previewInvoice(party)).previewHash).toBe(p.previewHash);
  const id = await persistInvoice(f.admin.id, {
    ...p,
    requestKey: crypto.randomUUID(),
  });
  await prisma.conversion.update({
    where: { id: f.conversion.id },
    data: { status: "CANCELLED" },
  });
  const next = await reads.previewInvoice(party);
  expect(next.total).toBe("-300.00");
  expect((await reads.getSummary(party))?.balance.outstanding).toBe("-400.00");
  await persistInvoice(f.admin.id, {
    ...next,
    requestKey: crypto.randomUUID(),
  });
  expect((await reads.previewInvoice(party)).lines).toEqual([]);
  expect((await reads.getInvoice(id))?.total).toBe("300.00");
});
it("protects concurrent issuance and stale previews", async () => {
  const f = await financeFixture(),
    p = await reads.previewInvoice({ kind: "brand", id: f.brand.id });
  const results = await Promise.allSettled([
    persistInvoice(f.admin.id, { ...p, requestKey: crypto.randomUUID() }),
    persistInvoice(f.admin.id, { ...p, requestKey: crypto.randomUUID() }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await prisma.financeInvoice.count()).toBe(1);
  const rejected = results.find((r) => r.status === "rejected");
  expect(rejected?.status === "rejected" && rejected.reason.message).toBe(
    "preview_changed",
  );
});
it("replays identical invoice submissions and rejects changed document instructions", async () => {
  const f = await financeFixture(),
    p = await reads.previewInvoice({ kind: "brand", id: f.brand.id }),
    input = { ...p, requestKey: crypto.randomUUID() };
  const ids = await Promise.all([
    persistInvoice(f.admin.id, input),
    persistInvoice(f.admin.id, input),
  ]);
  expect(ids[0]).toBe(ids[1]);
  await expect(
    persistInvoice(f.admin.id, {
      ...input,
      payee: { ...p.payee, iban: "changed" },
    }),
  ).rejects.toThrow("request_conflict");
});
it("uses all-time sources regardless of approval/product/link status", async () => {
  const f = await financeFixture();
  await prisma.product.update({
    where: { id: f.product.id },
    data: { status: "ARCHIVED" },
  });
  await prisma.trackingLink.update({
    where: { id: f.link.id },
    data: { status: "DISABLED" },
  });
  await prisma.partnership.update({
    where: { id: f.partnership.id },
    data: { status: "REJECTED" },
  });
  await prisma.conversion.update({
    where: { id: f.conversion.id },
    data: { occurredAt: new Date("2020-01-01") },
  });
  expect(
    (await reads.getSummary({ kind: "brand", id: f.brand.id }))?.balance.earned,
  ).toBe("300.00");
});
it("rejects inconsistent ownership and noncanonical source rows", async () => {
  const f = await financeFixture(),
    other = await seedBrand();
  await prisma.click.update({
    where: { id: f.click.id },
    data: { brandId: other.id },
  });
  expect(
    (await reads.getSummary({ kind: "brand", id: f.brand.id }))?.balance.earned,
  ).toBe("0.00");
  await prisma.click.update({
    where: { id: f.click.id },
    data: { brandId: f.brand.id },
  });
  await prisma.attribution.update({
    where: { id: f.attribution.id },
    data: { status: "MANUAL_REVIEW" },
  });
  expect(
    (await reads.getSummary({ kind: "creator", id: f.creator.id }))?.balance
      .earned,
  ).toBe("0.00");
});
it("enforces database financial constraints and keeps account history", async () => {
  const f = await financeFixture();
  const base = {
    requestKey: crypto.randomUUID(),
    requestHash: "a".repeat(64),
    kind: "PAYMENT" as const,
    amount: "1",
    transferredOn: new Date("2026-09-13"),
    partySnapshot: {},
    recordedById: f.admin.id,
  };
  for (const data of [
    { ...base },
    { ...base, brandId: f.brand.id, creatorId: f.creator.id },
    { ...base, brandId: f.brand.id, amount: "0" },
    { ...base, brandId: f.brand.id, amount: "-1" },
    { ...base, brandId: f.brand.id, kind: "REVERSAL" as const },
  ])
    await expect(prisma.financePayment.create({ data })).rejects.toThrow();
  const id = await persistPayment(f.admin.id, payment(f.brand.id));
  await expect(
    prisma.brand.delete({ where: { id: f.brand.id } }),
  ).rejects.toThrow();
  const reverse = await persistReversal(f.admin.id, {
    requestKey: crypto.randomUUID(),
    paymentId: id,
    reason: "Correction",
  });
  await expect(
    persistReversal(f.admin.id, {
      requestKey: crypto.randomUUID(),
      paymentId: reverse,
      reason: "Again",
    }),
  ).rejects.toThrow("invalid_reversal");
});
it("scopes owner reads and immutable document downloads", async () => {
  const f = await financeFixture(),
    other = await seedBrand(),
    p = await reads.previewInvoice({ kind: "brand", id: f.brand.id }),
    id = await persistInvoice(f.admin.id, {
      ...p,
      requestKey: crypto.randomUUID(),
    });
  const viewer = {
    kind: "brand" as const,
    userId: other.userId,
    brandId: other.id,
    brandName: other.name,
    isAdmin: false,
  };
  expect(await readFinanceInvoice(reads)(viewer, id)).toEqual({
    ok: false,
    error: "not_found",
  });
  const own = await readOwnFinance(reads)(viewer);
  expect(own.ok && own.value.party.id).toBe(other.id);
  expect(
    (await readFinanceInvoice(reads)({ ...viewer, isAdmin: true }, id)).ok,
  ).toBe(true);
});
