// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { describe, expect, it, vi } from "vitest";
import type { ConversionView } from "../ports/conversion-repository";
import { OrdersQueue } from "./orders-queue";

const copy = {
  all: "All orders",
  search: "Search orders",
  searchPlaceholder: "Search order, SKU or creator",
  details: "View order details",
  products: "Products",
  explanation: "Open an order to see its products.",
  cancelledNote: "Excluded from earnings",
  noResults: "No matching orders",
  reset: "Clear filters",
  previous: "Previous",
  next: "Next",
  page: "Page",
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
  afterEach(cleanup);

  it("counts distinct SKUs while retaining every reported line", () => {
    const original = order("CONFIRMED");
    const first = original.items[0]!;
    render(
      <OrdersQueue
        orders={[
          {
            ...original,
            items: [
              first,
              { ...first, id: "duplicate-line" },
              { ...first, id: "second-product", sku: "P-10" },
            ],
          },
        ]}
        locale="en"
        decisionAction={vi.fn()}
        copy={copy}
      />,
    );
    expect(screen.getByText("Products: 2")).toBeTruthy();
    expect(document.querySelectorAll("dl")).toHaveLength(3);
  });

  it("filters by status and creator, and resets an empty search", () => {
    render(
      <OrdersQueue
        orders={[order("CONFIRMED"), order("CANCELLED", false)]}
        locale="en"
        decisionAction={vi.fn()}
        copy={copy}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelled 1" }));
    expect(document.querySelectorAll("details")).toHaveLength(1);
    expect(screen.getByText("Excluded from earnings")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Nino" },
    });
    expect(screen.getByText("No matching orders")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(document.querySelectorAll("details")).toHaveLength(2);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "nino" },
    });
    expect(document.querySelectorAll("details")).toHaveLength(1);
  });

  it("paginates without losing orders", () => {
    const orders = Array.from({ length: 11 }, (_, index) => ({
      ...order("CONFIRMED"),
      id: `cv-${index}`,
      orderId: `order-${index}`,
    }));
    render(
      <OrdersQueue
        orders={orders}
        locale="en"
        decisionAction={vi.fn()}
        copy={copy}
      />,
    );
    expect(document.querySelectorAll("details")).toHaveLength(10);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(document.querySelectorAll("details")).toHaveLength(1);
    expect(screen.getByText("Order #order-10")).toBeTruthy();
  });
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
