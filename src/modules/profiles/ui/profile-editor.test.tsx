// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMessages, t } from "@/src/modules/localization";
import {
  ProfileEditor,
  PROFILE_EDITOR_COPY_KEYS,
  type ProfileEditorCopy,
} from "./profile-editor";
import { profileDesignCopy } from "./profile-design-copy";

const messages = getMessages("en");
const copy = Object.fromEntries(
  PROFILE_EDITOR_COPY_KEYS.map((key) => [
    key,
    t(messages, "profile.editor." + key),
  ]),
) as ProfileEditorCopy;
const profile = {
  status: "DRAFT",
  slug: "owner",
  taglineKa: "",
  taglineEn: "Original bio",
  descriptionKa: "",
  descriptionEn: "Original about",
  locationKa: "",
  locationEn: "Tbilisi",
  categories: ["Fashion"],
  languages: ["English"],
  contentFormats: ["Editorial"],
  heroImageUrl: "",
  socialLinks: [{ platform: "instagram", url: "https://instagram.com/owner" }],
  featuredWork: [],
};
function editor(
  saveAction = vi
    .fn()
    .mockResolvedValue({ status: "success", message: "Profile saved" }),
) {
  render(
    <ProfileEditor
      role="creator"
      locale="en"
      name="Owner"
      profile={profile}
      saveAction={saveAction}
      publishAction={vi.fn()}
      unpublishAction={vi.fn()}
      copy={copy}
      creatorCopy={{
        preview: "Preview",
        approved: "Approved",
        ledger: "Social profiles",
        supplied: "Supplied",
        disclosure: "Creator supplied",
        work: "Work",
        leave: "External",
        fallback: "From {locale}",
        source: "Source",
        languages: "Languages",
        contentFormats: "Formats",
        heroAlt: "Photo {name}",
        workAlt: "Work {title}",
        socialLabels: { instagram: "Instagram" },
      }}
    />,
  );
  return saveAction;
}
beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
describe("owner profile editor", () => {
  it("previews working text and preserves collection edits across tabs", async () => {
    const user = userEvent.setup();
    editor();
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    await user.clear(screen.getByLabelText("Short bio"));
    await user.type(screen.getByLabelText("Short bio"), "Working bio");
    await user.click(screen.getByRole("button", { name: "Links" }));
    await user.clear(screen.getByLabelText(copy.socialUrl));
    await user.type(
      screen.getByLabelText(copy.socialUrl),
      "https://instagram.com/changed",
    );
    await user.click(screen.getByRole("button", { name: "About" }));
    await user.click(
      screen.getAllByRole("button", { name: "Preview" }).at(-1)!,
    );
    expect(screen.getByText("Working bio", { selector: "p" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Instagram/ })).toHaveAttribute(
      "href",
      "https://instagram.com/changed",
    );
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(screen.getByLabelText("Short bio")).toHaveValue("Working bio");
  });
  it("keeps invalid submissions editable instead of resetting the draft", async () => {
    const user = userEvent.setup();
    const save = editor(
      vi
        .fn()
        .mockResolvedValue({ status: "error", message: "Fix the address" }),
    );
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    await user.clear(screen.getByLabelText("Short bio"));
    await user.type(screen.getByLabelText("Short bio"), "Keep this draft");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Short bio")).toHaveValue("Keep this draft");
    expect(
      screen.getByText("Unsaved changes", {
        selector: ".profile-savebar span",
      }),
    ).toBeVisible();
  });
  it("cancel restores the saved data and discards the preview", async () => {
    const user = userEvent.setup();
    editor();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByLabelText("Short bio"), {
      target: { value: "Discard me" },
    });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Original bio", { selector: "p" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(screen.getByLabelText("Short bio")).toHaveValue("Original bio");
  });
  it("ships actual Georgian translations", () => {
    for (const value of Object.values(profileDesignCopy("ka"))) {
      expect(value).not.toContain("???");
      expect(value).toMatch(/[\u10a0-\u10ff]/);
    }
  });
});
