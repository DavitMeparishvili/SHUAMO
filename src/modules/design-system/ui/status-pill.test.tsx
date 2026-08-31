// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PILL_STATES, StatusPill } from "./status-pill";

describe("StatusPill", () => {
  it.each(PILL_STATES)("%s renders its label as text", (state) => {
    render(<StatusPill state={state} label={`label-${state}`} />);
    expect(screen.getByText(`label-${state}`)).toBeVisible();
  });

  it("never conveys state by colour alone", () => {
    const { container } = render(
      <StatusPill state="cancelled" label="Cancelled" />,
    );
    expect(container.textContent?.trim()).not.toBe("");
  });
});
