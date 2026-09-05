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
  cancel: "Cancel order",
  pendingAction: "Saving",
  cancelConfirmedWarning: "This becomes a negative line.",
  statuses: {
    confirmed: "Confirmed",
    cancelled: "Cancelled",
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
    confirmedAt: "2026-09-02T09:00:00.000Z",
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
  it("shows exact line attribution and cancellation without a redundant confirmation", () => {
    const html = renderToStaticMarkup(
      <OrdersQueue
        orders={[order("CONFIRMED")]}
        locale="en"
        decisionAction={vi.fn()}
        copy={copy}
      />,
    );
    expect(html).toContain("Nino");
    expect(html.match(/10\.00 ₾/g)).toHaveLength(2);
    expect(html).not.toContain("Confirm order");
    expect(html).toContain("Cancel order");
  });

  it("keeps an unattributed sale confirmed and cancellable", () => {
    const html = renderToStaticMarkup(
      <OrdersQueue
        orders={[order("CONFIRMED", false)]}
        locale="en"
        decisionAction={vi.fn()}
        copy={copy}
      />,
    );
    expect(html).toContain("The click could not be resolved.");
    expect(html).toContain("Confirmed");
    expect(html).toContain("Cancel order");
  });
});
