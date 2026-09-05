// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CreatorWorkEditor } from "./creator-work-editor";
import { SocialLinksEditor } from "./social-links-editor";
import { ProfileFormats } from "./profile-form-controls";

const mediaCopy = {
  tooLarge: "Too large",
  uploading: "Uploading",
  complete: "Complete",
  failed: "Failed",
};

describe("profile editor collection controls", () => {
  it("preserves custom formats alongside the reference checkboxes", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ProfileFormats
        initialValue={["Editorial"]}
        locale="en"
        onDirty={() => {}}
      />,
    );
    await user.click(screen.getByText("Add format", { selector: "summary" }));
    await user.type(screen.getByLabelText("Add format"), "Photography");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("checkbox", { name: "Photography" })).toBeChecked();
    expect(container.querySelector('input[name="contentFormats"]')).toHaveValue(
      "Editorial,Photography",
    );
  });
  it("renders explicit social platform and URL pairs", async () => {
    const user = userEvent.setup();
    render(
      <SocialLinksEditor
        initialValue={[
          { platform: "instagram", url: "https://instagram.com/nino" },
        ]}
        copy={{
          label: "Social links",
          platform: "Platform",
          url: "URL",
          add: "Add social",
          remove: "Remove",
          platformLabels: {
            website: "Website",
            instagram: "Instagram",
            tiktok: "TikTok",
            youtube: "YouTube",
            facebook: "Facebook",
            linkedin: "LinkedIn",
          },
        }}
      />,
    );
    expect(screen.getByLabelText("Platform")).toHaveValue("instagram");
    expect(screen.getByLabelText("URL")).toHaveValue(
      "https://instagram.com/nino",
    );
    await user.click(screen.getByRole("button", { name: "Add social" }));
    expect(screen.getAllByLabelText("Platform")).toHaveLength(2);
  });

  it("keeps both localized work titles and supports ordered reordering", async () => {
    const user = userEvent.setup();
    render(
      <CreatorWorkEditor
        initialValue={[
          {
            title: { ka: "პირველი", en: "First" },
            url: "https://example.com/first",
            imageUrl: "/first.webp",
          },
          {
            title: { ka: "მეორე", en: "Second" },
            url: "https://example.com/second",
            imageUrl: "/second.webp",
          },
        ]}
        mediaCopy={mediaCopy}
        copy={{
          label: "Featured work",
          titleKa: "Title KA",
          titleEn: "Title EN",
          destination: "Destination",
          image: "Image",
          add: "Add work",
          remove: "Remove",
          up: "Move up",
          down: "Move down",
          maximum: "{count} of 6",
        }}
      />,
    );
    expect(
      screen
        .getAllByLabelText("Title KA")
        .map((input) => input.getAttribute("value")),
    ).toEqual(["პირველი", "მეორე"]);
    await user.click(screen.getAllByRole("button", { name: "Move down" })[0]!);
    expect(
      screen
        .getAllByLabelText("Title EN")
        .map((input) => input.getAttribute("value")),
    ).toEqual(["Second", "First"]);
  });
});
