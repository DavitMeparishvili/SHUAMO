// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyField } from "./copy-field";

const LABELS = {
  copyLabel: "Copy",
  copiedLabel: "Copied",
  copyErrorLabel: "Copy failed. Select and copy the value manually.",
} as const;

describe("CopyField", () => {
  it("copies the value and announces success in a polite live region", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CopyField {...LABELS} label="Link code" value="xu.ge/r/K7M2QP" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith("xu.ge/r/K7M2QP");
    expect(await screen.findByRole("status")).toHaveTextContent("Copied");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("announces a recoverable error when clipboard access fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CopyField {...LABELS} label="Link code" value="xu.ge/r/K7M2QP" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      LABELS.copyErrorLabel,
    );
    expect(screen.getByRole("button", { name: "Copy" })).toBeEnabled();
  });

  it("warns in visible text that a one-time value cannot be shown again", () => {
    render(
      <CopyField
        {...LABELS}
        label="API key"
        oneTimeWarning="This is the only time this value will be shown."
        revealOnce
        value="xu_sk_live_abc"
      />,
    );
    expect(screen.getByText(/only time/i)).toBeVisible();
  });
});
