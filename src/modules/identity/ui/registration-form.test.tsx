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

describe("registration team lead", () => {
  const teamLeads = [
    { id: "00000000-0000-4000-8000-00000000000a", displayName: "Ana Lead" },
  ];

  async function reachReview(choose?: string) {
    const user = userEvent.setup();
    const next = () =>
      user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText(/Full name/), "Nino Review");
    await next();
    await next();
    await user.type(screen.getByLabelText(/City/), "Tbilisi");
    await user.selectOptions(
      screen.getByLabelText(/Primary category/),
      "beauty",
    );
    if (choose)
      await user.selectOptions(
        screen.getByLabelText(/Team lead \(optional\)/),
        choose,
      );
    await next();
  }

  it("offers the leads on the creator Profile stage", () => {
    const { container } = render(
      <RegistrationForm
        locale="en"
        role="creator"
        existingEmail="review@example.test"
        teamLeads={teamLeads}
      />,
    );
    const select = screen.getByLabelText(
      /Team lead \(optional\)/,
    ) as HTMLSelectElement;
    expect(select.closest("[data-stage]")).toBe(
      container.querySelector('[data-stage="2"]'),
    );
    expect(select.options[0]?.textContent).toBe("No team lead");
    expect(select.options[1]?.textContent).toBe("Ana Lead");
    expect(
      screen.getByText("This can't be changed after registration."),
    ).toBeTruthy();
  });

  it("hides the field without leads or for a brand", () => {
    render(
      <RegistrationForm
        locale="en"
        role="creator"
        existingEmail="review@example.test"
        teamLeads={[]}
      />,
    );
    expect(screen.queryByLabelText(/Team lead \(optional\)/)).toBeNull();
    cleanup();
    render(
      <RegistrationForm
        locale="en"
        role="brand"
        existingEmail="review@example.test"
        teamLeads={teamLeads}
      />,
    );
    expect(screen.queryByLabelText(/Team lead \(optional\)/)).toBeNull();
  });

  it("lists the chosen lead on the Review stage", async () => {
    render(
      <RegistrationForm
        locale="en"
        role="creator"
        existingEmail="review@example.test"
        teamLeads={teamLeads}
      />,
    );
    await reachReview("Ana Lead");
    const term = screen.getByText("Team lead", { selector: "dt" });
    expect(term.nextElementSibling?.textContent).toBe("Ana Lead");
  });

  it("names no lead on the Review stage in Georgian", async () => {
    render(
      <RegistrationForm
        locale="ka"
        role="creator"
        existingEmail="review@example.test"
        teamLeads={teamLeads}
      />,
    );
    const user = userEvent.setup();
    const next = () =>
      user.click(screen.getByRole("button", { name: "გაგრძელება" }));
    await user.type(screen.getAllByRole("textbox")[0]!, "Nino Review");
    await next();
    await next();
    await user.type(screen.getByLabelText(/ქალაქი/), "Tbilisi");
    await user.selectOptions(
      screen.getByLabelText(/ძირითადი კატეგორია/),
      "beauty",
    );
    await next();
    const term = screen.getByText("გუნდის ლიდერი", { selector: "dt" });
    expect(term.nextElementSibling?.textContent).toBe("არ არის");
  });
});
