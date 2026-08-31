// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyField } from "./copy-field";

describe("CopyField", () => {
  it("shows the value and a copy control", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CopyField label="Link code" value="xu.ge/r/K7M2QP" />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(writeText).toHaveBeenCalledWith("xu.ge/r/K7M2QP");
    expect(
      await screen.findByRole("button", { name: /copied/i }),
    ).toBeVisible();
  });

  it("warns in visible text that a one-time value cannot be shown again", () => {
    render(<CopyField label="API key" value="xu_sk_live_abc" revealOnce />);
    expect(screen.getByText(/only time/i)).toBeVisible();
  });
});
