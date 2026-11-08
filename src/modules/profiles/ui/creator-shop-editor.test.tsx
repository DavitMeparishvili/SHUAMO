// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMessages, t } from "@/src/modules/localization";
import type { CreatorShopEditorItem } from "../domain/creator-shop";
import { CreatorShopEditor } from "./creator-shop-editor";
import {
  ProfileEditor,
  PROFILE_EDITOR_COPY_KEYS,
  type ProfileEditorCopy,
} from "./profile-editor";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

function item(
  id: string,
  overrides: Partial<CreatorShopEditorItem> = {},
): CreatorShopEditorItem {
  return {
    productId: id,
    position: 0,
    visible: true,
    availability: "available",
    title: id.toUpperCase(),
    brandName: "Brand",
    imageUrl: `/img/${id}.webp`,
    code: `CODE${id.toUpperCase()}`,
    ...overrides,
  };
}

function actions(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    add: vi.fn().mockResolvedValue({ ok: true }),
    remove: vi.fn().mockResolvedValue({ ok: true }),
    setVisible: vi.fn().mockResolvedValue({ ok: true }),
    reorder: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
}

function editor(
  options: {
    items?: CreatorShopEditorItem[];
    candidates?: Parameters<typeof CreatorShopEditor>[0]["candidates"];
    hasAnyLinks?: boolean;
    published?: boolean;
    acts?: ReturnType<typeof actions>;
  } = {},
) {
  const acts = options.acts ?? actions();
  render(
    <CreatorShopEditor
      locale="en"
      items={options.items ?? [item("a"), item("b"), item("c")]}
      candidates={options.candidates ?? []}
      profileUrl="/en/creators/owner"
      published={options.published ?? true}
      hasAnyLinks={options.hasAnyLinks ?? true}
      actions={acts}
    />,
  );
  return acts;
}

function rowTitles() {
  return Array.from(
    document.querySelectorAll(".shop-editor-list > li .shop-editor-name"),
  ).map((name) => name.textContent);
}

beforeEach(() => {
  refresh.mockReset();
  HTMLDialogElement.prototype.showModal = function showModal(
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

describe("creator shop editor", () => {
  it("toggling the switch calls setVisible and updates the summary", async () => {
    const user = userEvent.setup();
    const acts = editor();
    expect(
      screen.getByText("3 shown on profile · 0 hidden"),
    ).toBeInTheDocument();
    const switches = screen.getAllByRole("switch", { name: "Show on profile" });
    await user.click(switches[1]!);
    expect(acts.setVisible).toHaveBeenCalledWith("b", false);
    await waitFor(() =>
      expect(
        screen.getByText("2 shown on profile · 1 hidden"),
      ).toBeInTheDocument(),
    );
    expect(switches[1]).toHaveAttribute("aria-checked", "false");
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it('"Move to top" from the ⋯ menu calls reorder with the moved order', async () => {
    const user = userEvent.setup();
    const acts = editor();
    await user.click(
      screen.getByRole("button", { name: "More actions for C" }),
    );
    const menu = screen.getByRole("dialog", { name: "More actions for C" });
    expect(
      within(menu).getByRole("button", { name: "Move down" }),
    ).toBeDisabled();
    await user.click(within(menu).getByRole("button", { name: "Move to top" }));
    expect(acts.reorder).toHaveBeenCalledWith(["c", "a", "b"]);
    await waitFor(() => expect(rowTitles()).toEqual(["C", "A", "B"]));
  });

  it("removes an item from the ⋯ menu", async () => {
    const user = userEvent.setup();
    const acts = editor();
    await user.click(
      screen.getByRole("button", { name: "More actions for A" }),
    );
    await user.click(screen.getByRole("button", { name: "Remove from shop" }));
    expect(acts.remove).toHaveBeenCalledWith("a");
    await waitFor(() => expect(rowTitles()).toEqual(["B", "C"]));
  });

  it("keyboard reorder", async () => {
    const acts = editor();
    const handle = screen.getByRole("button", { name: "Reorder C" });
    handle.focus();
    fireEvent.keyDown(handle, { key: " " });
    expect(screen.getByText("Picked up C")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder C" }), {
      key: "ArrowUp",
    });
    expect(screen.getByText("Moved to position 2")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder C" }), {
      key: "ArrowUp",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder C" }), {
      key: " ",
    });
    expect(acts.reorder).toHaveBeenCalledWith(["c", "a", "b"]);
    expect(screen.getByText("Dropped C at position 1")).toBeInTheDocument();
    await waitFor(() => expect(rowTitles()).toEqual(["C", "A", "B"]));
  });

  it("Escape cancels a keyboard drag", () => {
    const acts = editor();
    const handle = screen.getByRole("button", { name: "Reorder C" });
    fireEvent.keyDown(handle, { key: "Enter" });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(rowTitles()).toEqual(["A", "C", "B"]);
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder C" }), {
      key: "Escape",
    });
    expect(acts.reorder).not.toHaveBeenCalled();
    expect(rowTitles()).toEqual(["A", "B", "C"]);
  });

  it("rolls back when reorder fails with invalid_order", async () => {
    const user = userEvent.setup();
    const acts = editor({
      acts: actions({
        reorder: vi.fn().mockResolvedValue({
          ok: false,
          error: "invalid_order",
        }),
      }),
    });
    await user.click(
      screen.getByRole("button", { name: "More actions for B" }),
    );
    await user.click(screen.getByRole("button", { name: "Move to top" }));
    expect(acts.reorder).toHaveBeenCalledWith(["b", "a", "c"]);
    expect(await screen.findByText("Couldn't save.")).toBeInTheDocument();
    expect(rowTitles()).toEqual(["A", "B", "C"]);
    expect(refresh).toHaveBeenCalled();
    // The stale order would fail again; the refresh is the fix.
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("treats a thrown action like a failed save", async () => {
    const user = userEvent.setup();
    const acts = editor({
      acts: actions({ setVisible: vi.fn().mockRejectedValue(new Error("db")) }),
    });
    const first = screen.getAllByRole("switch")[0]!;
    await user.click(first);
    expect(await screen.findByText("Couldn't save.")).toBeInTheDocument();
    expect(first).toHaveAttribute("aria-checked", "true");
    expect(refresh).toHaveBeenCalled();
    acts.setVisible.mockResolvedValue({ ok: true });
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(acts.setVisible).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("shows reason tags", () => {
    editor({ items: [item("a", { availability: "ended" })] });
    expect(screen.getByText("Offer ended · not shown")).toBeInTheDocument();
  });

  it("Hidden filter shows only hidden items", async () => {
    const user = userEvent.setup();
    editor({
      items: [item("a"), item("b", { visible: false }), item("c")],
    });
    await user.click(screen.getByRole("radio", { name: "Hidden" }));
    expect(rowTitles()).toEqual(["B"]);
    expect(
      screen.queryByRole("button", { name: /^Reorder/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "All" }));
    expect(rowTitles()).toEqual(["A", "B", "C"]);
  });

  it("picker adds selected candidates", async () => {
    const user = userEvent.setup();
    const acts = editor({
      candidates: [
        {
          productId: "x",
          title: "Scarf",
          brandName: "Silk",
          imageUrl: null,
          availability: "no-photo",
        },
        {
          productId: "y",
          title: "Candle",
          brandName: "Aroma",
          imageUrl: "/y",
          availability: "available",
        },
        {
          productId: "z",
          title: "Soap",
          brandName: "Aroma",
          imageUrl: "/z",
          availability: "available",
        },
      ],
    });
    await user.click(screen.getByRole("button", { name: "Add products" }));
    const picker = screen.getByRole("dialog", { name: "Add products" });
    await user.type(
      within(picker).getByRole("searchbox", { name: "Search products" }),
      "aroma",
    );
    expect(within(picker).queryByLabelText(/Scarf/)).toBeNull();
    await user.click(within(picker).getByRole("checkbox", { name: /Candle/ }));
    await user.click(within(picker).getByRole("checkbox", { name: /Soap/ }));
    await user.click(within(picker).getByRole("button", { name: "Add (2)" }));
    expect(acts.add).toHaveBeenCalledWith(["y", "z"]);
    await waitFor(() =>
      expect(rowTitles()).toEqual(["Candle", "Soap", "A", "B", "C"]),
    );
  });

  it("picker explains when every product is already added", async () => {
    const user = userEvent.setup();
    editor();
    await user.click(screen.getByRole("button", { name: "Add products" }));
    expect(
      screen.getByText(
        "Every product you have a link for is already in your shop.",
      ),
    ).toBeInTheDocument();
  });

  it("empty state links to Links page when the creator has no links", () => {
    editor({ items: [], hasAnyLinks: false });
    expect(screen.getByText("Build your shop")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Get links first" }),
    ).toHaveAttribute("href", "/en/creator/links");
  });

  it("explains that an unpublished profile hides the shop", () => {
    editor({ published: false });
    expect(
      screen.getByText(
        "Your shop will be visible once your profile is published.",
      ),
    ).toBeInTheDocument();
  });
});

describe("creator shop editor review fixes", () => {
  function pointer(type: string, target: EventTarget, clientY: number) {
    act(() => {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 7,
          pointerType: "mouse",
          button: 0,
          clientY,
        }),
      );
    });
  }

  it("finishes a pointer drag released away from the handle", async () => {
    const acts = editor();
    const handle = screen.getByRole("button", { name: "Reorder A" });
    pointer("pointerdown", handle, 10);
    // jsdom rows have zero-size rects, so any lower Y moves to the bottom.
    pointer("pointermove", window, 500);
    expect(rowTitles()).toEqual(["B", "C", "A"]);
    pointer("pointerup", window, 500);
    expect(acts.reorder).toHaveBeenCalledWith(["b", "c", "a"]);
    await waitFor(() => expect(rowTitles()).toEqual(["B", "C", "A"]));
    // A later drag still works.
    pointer(
      "pointerdown",
      screen.getByRole("button", { name: "Reorder B" }),
      0,
    );
    pointer("pointermove", window, 500);
    pointer("pointerup", window, 500);
    expect(acts.reorder).toHaveBeenLastCalledWith(["c", "a", "b"]);
  });

  it("Escape cancels a pointer drag", () => {
    const acts = editor();
    pointer(
      "pointerdown",
      screen.getByRole("button", { name: "Reorder A" }),
      0,
    );
    pointer("pointermove", window, 500);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(rowTitles()).toEqual(["A", "B", "C"]);
    pointer("pointerup", window, 500);
    expect(acts.reorder).not.toHaveBeenCalled();
  });

  it("does not announce a drop for a plain click on the handle", () => {
    editor();
    const handle = screen.getByRole("button", { name: "Reorder A" });
    pointer("pointerdown", handle, 0);
    pointer("pointerup", window, 0);
    expect(screen.queryByText(/Dropped/)).toBeNull();
  });

  it("treats removing an already-removed item as done", async () => {
    const user = userEvent.setup();
    editor({
      acts: actions({
        remove: vi.fn().mockResolvedValue({ ok: false, error: "not_found" }),
      }),
    });
    await user.click(
      screen.getByRole("button", { name: "More actions for A" }),
    );
    await user.click(screen.getByRole("button", { name: "Remove from shop" }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(rowTitles()).toEqual(["B", "C"]);
  });

  it("moves focus to the next row's ⋯ button after removing", async () => {
    const user = userEvent.setup();
    editor();
    await user.click(
      screen.getByRole("button", { name: "More actions for B" }),
    );
    await user.click(screen.getByRole("button", { name: "Remove from shop" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "More actions for C" }),
      ).toHaveFocus(),
    );
  });

  it("falls back to Add products after removing the last item", async () => {
    const user = userEvent.setup();
    editor({ items: [item("a")] });
    await user.click(
      screen.getByRole("button", { name: "More actions for A" }),
    );
    await user.click(screen.getByRole("button", { name: "Remove from shop" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add products" }),
      ).toHaveFocus(),
    );
  });

  it("offers Close in the phone sheet", async () => {
    const user = userEvent.setup();
    editor();
    await user.click(
      screen.getByRole("button", { name: "More actions for A" }),
    );
    const menu = screen.getByRole("dialog", { name: "More actions for A" });
    await user.click(within(menu).getByRole("button", { name: "Close" }));
    expect(menu).not.toHaveAttribute("open");
  });

  it("hides move actions while a filter is active", async () => {
    const user = userEvent.setup();
    editor({ items: [item("a"), item("b", { visible: false })] });
    await user.click(screen.getByRole("radio", { name: "Hidden" }));
    await user.click(
      screen.getByRole("button", { name: "More actions for B" }),
    );
    const menu = screen.getByRole("dialog", { name: "More actions for B" });
    expect(within(menu).queryByRole("button", { name: /^Move/ })).toBeNull();
    expect(
      within(menu).getByRole("button", { name: "Remove from shop" }),
    ).toBeInTheDocument();
  });

  it("keeps the live preview out of the tab order and click path", () => {
    const { container } = render(
      <CreatorShopEditor
        locale="en"
        items={[item("a")]}
        candidates={[]}
        profileUrl={null}
        published
        hasAnyLinks
        actions={actions()}
      />,
    );
    const phone = container.querySelector(".shop-phone")!;
    expect(phone).toHaveAttribute("inert");
    expect(phone).toHaveAttribute("aria-hidden", "true");
  });

  it("tags an added ended offer immediately", async () => {
    const user = userEvent.setup();
    editor({
      candidates: [
        {
          productId: "e",
          title: "Ended",
          brandName: "Aroma",
          imageUrl: "/e",
          availability: "ended",
        },
      ],
    });
    await user.click(screen.getByRole("button", { name: "Add products" }));
    await user.click(screen.getByRole("checkbox", { name: /Ended/ }));
    await user.click(screen.getByRole("button", { name: "Add (1)" }));
    expect(
      await screen.findByText("Offer ended · not shown"),
    ).toBeInTheDocument();
  });

  it("opens the ⋯ popover inside the viewport from the clicked button", async () => {
    const user = userEvent.setup();
    // jsdom has no matchMedia; a wide screen makes the menu a popover.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    editor();
    const trigger = screen.getByRole("button", { name: "More actions for C" });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight - 30,
      bottom: window.innerHeight - 6,
      left: 300,
      right: 344,
      width: 44,
      height: 24,
      x: 300,
      y: window.innerHeight - 30,
      toJSON: () => ({}),
    });
    // Firefox and Safari do not focus a button on click.
    trigger.addEventListener("mousedown", (event) => event.preventDefault());
    await user.click(trigger);
    const menu = screen.getByRole("dialog", { name: "More actions for C" });
    const top = parseFloat(menu.style.getPropertyValue("--menu-top"));
    expect(top).toBeGreaterThanOrEqual(8);
    expect(top).toBeLessThan(window.innerHeight - 30);
    expect(menu.style.getPropertyValue("--menu-left")).not.toBe("");
    delete (window as { matchMedia?: unknown }).matchMedia;
  });
});

describe("profile editor shop tab", () => {
  it("ProfileEditor shop tab hides the draft form", async () => {
    const user = userEvent.setup();
    const messages = getMessages("en");
    const copy = Object.fromEntries(
      PROFILE_EDITOR_COPY_KEYS.map((key) => [
        key,
        t(messages, "profile.editor." + key),
      ]),
    ) as ProfileEditorCopy;
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(
      <ProfileEditor
        role="creator"
        locale="en"
        name="Owner"
        profile={{ status: "DRAFT", slug: "owner" }}
        saveAction={vi.fn()}
        publishAction={vi.fn()}
        unpublishAction={vi.fn()}
        copy={copy}
        shop={<p>shop body</p>}
      />,
    );
    expect(screen.queryByText("shop body")).not.toBeVisible();
    const saveDraft = screen.getByRole("button", { name: "Save draft" });
    expect(saveDraft).toBeVisible();
    await act(() => user.click(screen.getByRole("button", { name: "Shop" })));
    expect(screen.getByText("shop body")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Save draft" }),
    ).not.toBeInTheDocument();
  });
});

describe("profile editor shop tab isolation", () => {
  it("using the Shop tab never marks the profile dirty", async () => {
    const user = userEvent.setup();
    const messages = getMessages("en");
    const copy = Object.fromEntries(
      PROFILE_EDITOR_COPY_KEYS.map((key) => [
        key,
        t(messages, "profile.editor." + key),
      ]),
    ) as ProfileEditorCopy;
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const acts = actions();
    render(
      <ProfileEditor
        role="creator"
        locale="en"
        name="Owner"
        profile={{ status: "PUBLISHED", slug: "owner" }}
        saveAction={vi.fn()}
        publishAction={vi.fn()}
        unpublishAction={vi.fn()}
        copy={copy}
        shop={
          <CreatorShopEditor
            locale="en"
            items={[item("a"), item("b")]}
            candidates={[]}
            profileUrl="/en/creators/owner"
            published
            hasAnyLinks
            actions={acts}
          />
        }
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    await user.click(screen.getByRole("button", { name: "Shop" }));
    await user.click(screen.getAllByRole("switch")[0]!);
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder B" }), {
      key: " ",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder B" }), {
      key: "ArrowUp",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder B" }), {
      key: " ",
    });
    expect(acts.setVisible).toHaveBeenCalled();
    expect(acts.reorder).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "About" }));
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);
  });
});
