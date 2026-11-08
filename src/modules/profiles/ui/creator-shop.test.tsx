// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreatorShop } from "./creator-shop";

function items(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    productId: `p${index + 1}`,
    code: `CODE${index + 1}`,
    title: `Title ${index + 1}`,
    brandName: "Brand",
    imageUrl: `/img/${index + 1}.webp`,
  }));
}

describe("public creator shop", () => {
  it("renders nothing without items", () => {
    const { container } = render(<CreatorShop items={[]} locale="en" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links each card to the tracked redirect", () => {
    const { container } = render(<CreatorShop items={items(2)} locale="en" />);
    const first = screen.getAllByRole("link")[0]!;
    expect(first).toHaveAttribute("href", "/r/CODE1");
    expect(first).toHaveAttribute("rel", "sponsored noopener");
    expect(first).toHaveAttribute("target", "_blank");
    expect(first).toHaveAccessibleName("Brand – Title 1, opens shop");
    expect(
      screen.getByRole("heading", { name: /Shop my picks/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/affiliate links/i)).toBeNull();
    expect(container.querySelector(".creator-shop-disclosure")).toBeNull();
  });

  it("shows no price", () => {
    render(<CreatorShop items={items(3)} locale="en" />);
    expect(screen.queryByText(/₾|GEL/)).toBeNull();
  });

  it("lazy-loads images after the first row", () => {
    const { container } = render(<CreatorShop items={items(6)} locale="en" />);
    const images = container.querySelectorAll("img");
    expect(images[0]).not.toHaveAttribute("loading", "lazy");
    expect(images[4]).toHaveAttribute("loading", "lazy");
    expect(images[0]).toHaveAttribute("width", "400");
    expect(images[0]).toHaveAttribute("alt", "");
  });

  it("shows 12 of 40 items then reveals the rest in order", () => {
    const { container } = render(<CreatorShop items={items(40)} locale="en" />);
    expect(container.querySelectorAll("a[href^='/r/']")).toHaveLength(40);
    expect(screen.getAllByRole("link")).toHaveLength(12);
    fireEvent.click(screen.getByRole("button", { name: "Show more (28)" }));
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(40);
    expect(links[39]).toHaveAttribute("href", "/r/CODE40");
    expect(screen.queryByRole("button", { name: /Show more/ })).toBeNull();
  });

  it("renders Georgian copy", () => {
    render(<CreatorShop items={items(1)} locale="ka" />);
    const section = screen.getByRole("region", {
      name: /ჩემი რჩეული პროდუქტები/,
    });
    expect(
      within(section).getByRole("link", {
        name: "Brand – Title 1, გაიხსნება მაღაზია",
      }),
    ).toBeInTheDocument();
  });
});
