import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ConversionView } from "../ports/conversion-repository";
import { OrdersQueue } from "./orders-queue";

const copy = {
  emptyTitle: "No orders",
  emptyBody: "Orders appear here.",
  order: "Order",
  date: "Reported",
  lineItems: "Line items",
  sku: "SKU",
  quantity: "Quantity",
  creator: "Creator",
  commission: "Commission",
  noAttribution: "No attribution",
  unattributedExplanation: "The click could not be resolved.",
  confirm: "Confirm order",
  cancel: "Cancel order",
  pendingAction: "Saving",
  cancelConfirmedWarning: "This becomes a negative line.",
  statuses: {
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    unattributed: "Unattributed",
  },
};

function order(
  status: ConversionView["status"],
  attribution = true,
): ConversionView {
  return {
    id: `cv-${status}`,
    orderId: status,
    occurredAt: "2026-09-02T08:00:00.000Z",
    status,
    confirmedAt:
      status === "CONFIRMED" ? "2026-09-02T09:00:00.000Z" : undefined,
    commissionAmount: attribution ? "10.00" : "0.00",
    items: [
      {
        id: `ci-${status}`,
        sku: "P-9",
        qty: 1,
        unitPrice: "100.00",
        lineDiscount: "0.00",
        lineVat: "0.00",
        commissionableNet: "100.00",
        attribution: attribution
          ? {
              clickId: "ck_1",
              creatorId: "c1",
              creatorName: "Nino",
              productId: "p1",
              commissionAmount: "10.00",
            }
          : undefined,
      },
    ],
  };
}

describe("OrdersQueue", () => {
  it("shows exact line attribution and whole-order actions for pending", () => {
    const html = renderToStaticMarkup(
      <OrdersQueue
        orders={[order("PENDING")]}
        locale="en"
        decisionAction={vi.fn()}
        copy={copy}
      />,
    );
    expect(html).toContain("Nino");
    expect(html.match(/10\.00 ₾/g)).toHaveLength(2);
    expect(html).toContain("Confirm order");
    expect(html).toContain("Cancel order");
  });

  it("surfaces UNATTRIBUTED orders without actions", () => {
    const html = renderToStaticMarkup(
      <OrdersQueue
        orders={[order("UNATTRIBUTED", false)]}
        locale="en"
        decisionAction={vi.fn()}
        copy={copy}
      />,
    );
    expect(html).toContain("The click could not be resolved.");
    expect(html).not.toContain("<button");
  });
});
