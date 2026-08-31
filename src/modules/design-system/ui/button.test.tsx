import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("is a real button element with an accessible name", () => {
    render(<Button>Confirm</Button>);
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("keeps the label visible while pending, never collapsing to a spinner", () => {
    render(
      <Button pending pendingLabel="Confirming…">
        Confirm
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName(/Confirm/);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText("Confirming…")).toBeVisible();
  });

  it("meets the 44px minimum target at both sizes", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button").className).toContain("min-h-[44px]");
  });

  it("marks a disabled button to assistive technology", () => {
    render(<Button disabled>Confirm</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
