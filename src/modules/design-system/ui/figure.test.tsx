// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Money } from "@/src/modules/shared";
import { Figure } from "./figure";
import { MoneyAmount } from "./money";

describe("Figure", () => {
  it("associates the label with the value", () => {
    render(<Figure label="Unique clicks" value="128" />);
    expect(screen.getByText("Unique clicks")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
  });

  it("marks an estimate in the visible label — the Estimate Rule", () => {
    render(
      <Figure
        label="You earn per sale"
        value={<MoneyAmount value={Money.of("30.00")} />}
        estimate
        estimateLabel="estimate, based on catalogue price"
      />,
    );
    expect(screen.getByText(/estimate/i)).toBeVisible();
  });

  it("links to its rows when given an href — the Provenance Rule", () => {
    render(
      <Figure label="Accrued" value="847.22" href="/ka/earnings/accrued" />,
    );
    expect(screen.getByRole("link", { name: /accrued/i })).toHaveAttribute(
      "href",
      "/ka/earnings/accrued",
    );
  });
});
