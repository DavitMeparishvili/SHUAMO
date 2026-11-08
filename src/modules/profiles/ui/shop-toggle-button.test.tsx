// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShopToggleButton } from "./shop-toggle-button";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

const id = "6f1c2a4e-7b1d-4c3e-9a2f-0e5d8b7c6a11";

function toggle(inShop: boolean, overrides: Record<string, unknown> = {}) {
  const props = {
    add: vi.fn().mockResolvedValue({ ok: true }),
    remove: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
  render(
    <ShopToggleButton
      productId={id}
      inShop={inShop}
      locale="en"
      add={props.add}
      remove={props.remove}
    />,
  );
  return props;
}

beforeEach(() => refresh.mockReset());

describe("shop toggle on the Links page", () => {
  it("adds then shows In shop", async () => {
    const user = userEvent.setup();
    const { add } = toggle(false);
    const button = screen.getByRole("button", { name: "Add to shop" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button);
    expect(add).toHaveBeenCalledWith([id]);
    await waitFor(() => expect(button).toHaveTextContent("✓ In shop"));
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAccessibleName("In shop");
  });

  it("removes when already in shop", async () => {
    const user = userEvent.setup();
    const { remove } = toggle(true);
    await user.click(screen.getByRole("button", { name: "In shop" }));
    expect(remove).toHaveBeenCalledWith(id);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add to shop" }),
      ).toHaveAttribute("aria-pressed", "false"),
    );
  });

  it("reverts when the action fails", async () => {
    const user = userEvent.setup();
    const { add } = toggle(false, {
      add: vi.fn().mockResolvedValue({ ok: false, error: "not_eligible" }),
    });
    await user.click(screen.getByRole("button", { name: "Add to shop" }));
    expect(await screen.findByText("Couldn't save.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to shop" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(refresh).toHaveBeenCalled();
    add.mockResolvedValue({ ok: true });
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "In shop" })).toBeVisible(),
    );
    expect(screen.queryByText("Couldn't save.")).toBeNull();
  });

  it("treats a thrown action like a failure", async () => {
    const user = userEvent.setup();
    toggle(true, { remove: vi.fn().mockRejectedValue(new Error("db")) });
    await user.click(screen.getByRole("button", { name: "In shop" }));
    expect(await screen.findByText("Couldn't save.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "In shop" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("is disabled while a save is in flight", async () => {
    const user = userEvent.setup();
    let resolve: (value: { ok: true }) => void = () => {};
    toggle(false, {
      add: vi.fn(
        () =>
          new Promise<{ ok: true }>((done) => {
            resolve = done;
          }),
      ),
    });
    const button = screen.getByRole("button", { name: "Add to shop" });
    await user.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    resolve({ ok: true });
    await waitFor(() => expect(button).toBeEnabled());
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
