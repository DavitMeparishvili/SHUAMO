// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteFrame } from "./site-frame";
import type { MarketingCopy } from "./marketing-copy";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/creator",
  useSearchParams: () => new URLSearchParams(),
}));

const copy = new Proxy({}, { get: (_, key) => String(key) }) as MarketingCopy;
const creator = {
  kind: "creator" as const,
  userId: "u1",
  creatorId: "c1",
  displayName: "Nino",
  isAdmin: false,
};

function hrefs(nav: HTMLElement) {
  return within(nav)
    .getAllByRole("link", { hidden: true })
    .map((link) => link.getAttribute("href"));
}

describe("SiteFrame workspace navigation", () => {
  it("shows My team to a team lead right after performance, on desktop and in the mobile menu", () => {
    render(
      <SiteFrame
        locale="en"
        marketingCopy={copy}
        viewer={{ ...creator, isTeamLead: true }}
      >
        <p>content</p>
      </SiteFrame>,
    );
    const desktop = screen.getByRole("navigation", { name: "nav.primary" });
    const desktopHrefs = hrefs(desktop);
    expect(desktopHrefs[desktopHrefs.indexOf("/en/creator/earnings") + 1]).toBe(
      "/en/creator/team",
    );
    expect(
      within(desktop).getByRole("link", { name: "My team" }),
    ).toHaveAttribute("href", "/en/creator/team");
    const mobile = screen.getByRole("navigation", {
      name: "nav.destinations",
      hidden: true,
    });
    expect(hrefs(mobile)).toContain("/en/creator/team");
  });

  it("does not show My team to a plain creator", () => {
    render(
      <SiteFrame locale="en" marketingCopy={copy} viewer={creator}>
        <p>content</p>
      </SiteFrame>,
    );
    expect(
      document.querySelector('a[href="/en/creator/team"]'),
    ).not.toBeInTheDocument();
  });
});
