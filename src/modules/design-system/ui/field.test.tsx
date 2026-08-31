// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./field";

describe("Field", () => {
  it("associates the label with the input", () => {
    render(<Field id="sku" label="SKU" />);
    expect(screen.getByLabelText("SKU")).toBeInTheDocument();
  });

  it("links an error message and marks the input invalid", () => {
    render(<Field id="rate" label="Rate" error="Use a fraction below 1" />);
    const input = screen.getByLabelText("Rate");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/fraction below 1/);
  });

  it("links a hint when there is no error", () => {
    render(<Field id="rate" label="Rate" hint="0.125 means 12.5%" />);
    expect(screen.getByLabelText("Rate")).toHaveAccessibleDescription(
      /0.125 means 12.5%/,
    );
  });

  it("marks a required field to assistive technology", () => {
    render(<Field id="sku" label="SKU" required />);
    expect(screen.getByLabelText(/SKU/)).toBeRequired();
  });
});
