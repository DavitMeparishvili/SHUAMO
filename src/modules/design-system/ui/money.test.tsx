import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Money } from "@/src/modules/shared";
import { MoneyAmount } from "./money";

describe("MoneyAmount", () => {
  it("always renders two decimal places and the lari sign", () => {
    render(<MoneyAmount value={Money.of("22.5")} />);
    expect(screen.getByText("22.50 ₾")).toBeInTheDocument();
  });

  it("sets tabular numerals — the Money-Is-Mono Rule", () => {
    render(<MoneyAmount value={Money.of("11.44")} />);
    expect(screen.getByText("11.44 ₾").className).toContain("type-figure");
  });

  it("renders a negative amount with a sign, not only a colour", () => {
    render(<MoneyAmount value={Money.of("-11.44")} tone="reversed" />);
    expect(screen.getByText("-11.44 ₾")).toBeInTheDocument();
  });

  it("exposes the exact value to assistive technology", () => {
    render(<MoneyAmount value={Money.of("1694.92")} />);
    expect(screen.getByText("1694.92 ₾")).toHaveAttribute(
      "data-amount",
      "1694.92",
    );
  });

  it("refuses a number", () => {
    // @ts-expect-error Money components never take a JavaScript number.
    expect(() => render(<MoneyAmount value={22.5} />)).toThrow(TypeError);
  });
});
