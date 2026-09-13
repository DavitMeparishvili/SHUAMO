// @vitest-environment jsdom
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreatorsDirectory } from "./creators-directory";
import type { CreatorDirectoryItem } from "../domain/creator-directory";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/brand/creators",
  useSearchParams: () => new URLSearchParams(),
}));
const item: CreatorDirectoryItem = {
  id: "creator-1",
  name: "Test creator",
  tagline: "",
  location: "",
  locationKey: "",
  imageUrl: "",
  profileHref: null,
  categories: [],
  formats: [],
  status: "NOT_PARTNERED",
  partnershipId: null,
  createdAt: "2026-09-01T00:00:00Z",
  appliedAt: null,
  linkCount: 0,
  hasSale: false,
};
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
describe("creator partnership actions", () => {
  it("explains immediate approval before inviting and calls the creator-scoped action", async () => {
    const invite = vi.fn().mockResolvedValue(undefined);
    const decide = vi.fn();
    render(
      <CreatorsDirectory
        locale="en"
        items={[item]}
        inviteAction={invite}
        decideAction={decide}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Invite creator" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("approves a partnership immediately");
    expect(invite).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Invite creator",
      }),
    );
    await waitFor(() => expect(invite).toHaveBeenCalledWith("creator-1"));
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    expect(decide).not.toHaveBeenCalled();
    expect(screen.getByText("Test creator: Partnership updated")).toBeVisible();
  });
  it("retains the dialog with retry feedback when a decision fails", async () => {
    const decide = vi.fn().mockRejectedValue(new Error("request failed"));
    render(
      <CreatorsDirectory
        locale="en"
        items={[{ ...item, status: "PENDING", partnershipId: "partnership-1" }]}
        inviteAction={vi.fn()}
        decideAction={decide}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Review application" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith("partnership-1", "APPROVE"),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Please try again",
    );
    expect(dialog).toHaveAttribute("open");
    expect(
      within(dialog).getByRole("button", { name: "Approve" }),
    ).toBeEnabled();
  });
});
