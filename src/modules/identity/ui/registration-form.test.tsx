// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { RegistrationForm } from "./registration-form";

afterEach(cleanup);

describe("staged registration recovery", () => {
  it("rejects an invalid phone on the account stage with an associated explanation", async () => {
    const user = userEvent.setup();
    render(
      <RegistrationForm
        locale="en"
        role="creator"
        existingEmail="review@example.test"
      />,
    );
    await user.type(screen.getByLabelText(/Full name/), "Nino Review");
    await user.type(screen.getByLabelText(/Phone/), "invalid phone");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert").textContent).toContain("phone number");
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "Account",
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText(/Phone/).getAttribute("aria-describedby"),
      ).toBe("registration-error"),
    );
  });

  it("validates the named social platform before advancing and shows its URL in review", async () => {
    const user = userEvent.setup();
    render(
      <RegistrationForm
        locale="en"
        role="creator"
        existingEmail="review@example.test"
      />,
    );
    await user.type(screen.getByLabelText(/Full name/), "Nino Review");
    const next = () =>
      user.click(screen.getByRole("button", { name: "Continue" }));
    await next();
    await user.type(
      screen.getByLabelText("Instagram"),
      "https://facebook.com/wrong",
    );
    await next();
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "Channels",
    );
    expect(screen.getByRole("alert").textContent).toContain("social platform");
    await user.clear(screen.getByLabelText("Instagram"));
    await user.type(
      screen.getByLabelText("Instagram"),
      "https://instagram.com/nino_review",
    );
    await next();
    await user.type(screen.getByLabelText(/City/), "Tbilisi");
    await user.selectOptions(
      screen.getByLabelText(/Primary category/),
      "beauty",
    );
    await next();
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "Review",
    );
    expect(screen.getByText("https://instagram.com/nino_review")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect((screen.getByLabelText(/City/) as HTMLInputElement).value).toBe(
      "Tbilisi",
    );
  });
});
