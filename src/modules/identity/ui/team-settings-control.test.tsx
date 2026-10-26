// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeamSettingsControl } from "./team-settings-control";

const creatorId = "00000000-0000-4000-8000-000000000001";
const leadA = {
  id: "00000000-0000-4000-8000-00000000000a",
  displayName: "Ana",
};
const leadB = {
  id: "00000000-0000-4000-8000-00000000000b",
  displayName: "Beka",
};
const leads = [leadA, leadB, { id: creatorId, displayName: "Self" }];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderControl(initial: {
  isTeamLead: boolean;
  teamLeadId: string | null;
  teamLeadName?: string | null;
  memberCount: number;
}) {
  return render(
    <TeamSettingsControl
      creatorId={creatorId}
      locale="en"
      initial={initial}
      leads={leads}
    />,
  );
}

describe("team settings control", () => {
  it("offers No team lead plus every other lead", () => {
    renderControl({ isTeamLead: false, teamLeadId: null, memberCount: 0 });
    expect(
      screen.getByRole("checkbox", { name: "This creator is a team lead" }),
    ).toBeTruthy();
    const select = screen.getByRole("combobox", { name: "Assigned team lead" });
    expect(
      Array.from((select as HTMLSelectElement).options).map(
        (option) => option.textContent,
      ),
    ).toEqual(["No team lead", "Ana", "Beka"]);
  });

  it("locks the lead field while the creator has members", () => {
    renderControl({ isTeamLead: true, teamLeadId: null, memberCount: 2 });
    const select = screen.getByRole("combobox", {
      name: "Assigned team lead",
    }) as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(
      screen.getByText("Remove this creator's 2 team members first"),
    ).toBeTruthy();
    expect(screen.getByText("2 team members")).toBeTruthy();
  });

  it("locks the lead toggle while the creator has a lead", () => {
    renderControl({ isTeamLead: false, teamLeadId: leadA.id, memberCount: 0 });
    const checkbox = screen.getByRole("checkbox", {
      name: "This creator is a team lead",
    }) as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
    expect(
      screen.getByText("Clear this creator's team lead first"),
    ).toBeTruthy();
  });

  it("uses the singular for one member", () => {
    renderControl({ isTeamLead: true, teamLeadId: null, memberCount: 1 });
    expect(screen.getByText("1 team member")).toBeTruthy();
    expect(
      screen.getByText("Remove this creator's 1 team member first"),
    ).toBeTruthy();
  });

  it("names a current lead who is no longer active", () => {
    renderControl({
      isTeamLead: false,
      teamLeadId: "00000000-0000-4000-8000-0000000000cc",
      teamLeadName: "Gela",
      memberCount: 0,
    });
    const select = screen.getByRole("combobox", {
      name: "Assigned team lead",
    }) as HTMLSelectElement;
    expect(select.selectedOptions[0]?.textContent).toBe(
      "Gela (no longer active)",
    );
  });

  it("derives locks from the current form values", async () => {
    const user = userEvent.setup();
    renderControl({ isTeamLead: false, teamLeadId: null, memberCount: 0 });
    const checkbox = screen.getByRole("checkbox", {
      name: "This creator is a team lead",
    }) as HTMLInputElement;
    const select = screen.getByRole("combobox", {
      name: "Assigned team lead",
    }) as HTMLSelectElement;

    await user.click(checkbox);
    expect(select.disabled).toBe(true);
    expect(screen.getByText("Turn off team lead first")).toBeTruthy();
    await user.click(checkbox);
    expect(select.disabled).toBe(false);

    await user.selectOptions(select, "Ana");
    expect(checkbox.disabled).toBe(true);
    await user.selectOptions(select, "No team lead");
    expect(checkbox.disabled).toBe(false);
  });

  it("saves the chosen values and sends null for No team lead", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ isTeamLead: false, teamLeadId: null }),
    );
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderControl({ isTeamLead: false, teamLeadId: leadA.id, memberCount: 0 });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Assigned team lead" }),
      "No team lead",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      `/api/admin/creators/${creatorId}/team`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTeamLead: false, teamLeadId: null }),
      },
    );
    expect(await screen.findByText("Team settings saved.")).toBeTruthy();
  });

  it("explains a rule the server rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "not_a_lead" }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderControl({ isTeamLead: false, teamLeadId: null, memberCount: 0 });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Assigned team lead" }),
      "Beka",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("The chosen creator is no longer a team lead."),
    ).toBeTruthy();
  });
});
