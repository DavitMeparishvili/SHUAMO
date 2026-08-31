// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./card";
import { Figure } from "./figure";

describe("destination interaction states", () => {
  it("uses accessible signal borders for a raised destination card", () => {
    render(
      <Card as="a" href="/rows" raised>
        Rows
      </Card>,
    );
    const destination = screen.getByRole("link", { name: "Rows" });
    expect(destination.className).toContain("hover:border-signal");
    expect(destination.className).toContain("active:border-signal-active");
    expect(destination.className).not.toContain("hover:border-signal-200");
  });

  it("uses the same accessible boundary states for linked figures", () => {
    render(<Figure href="/rows" label="Accrued" value="12.00" />);
    const destination = screen.getByRole("link", { name: /accrued/i });
    expect(destination.className).toContain("hover:border-signal");
    expect(destination.className).toContain("active:border-signal-active");
  });
});
