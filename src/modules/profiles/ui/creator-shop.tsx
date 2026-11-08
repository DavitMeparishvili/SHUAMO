"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/src/modules/localization";
import { SHOP_INITIAL_VISIBLE } from "../domain/creator-shop";
import type { PublicShopItem } from "../domain/creator-shop";
import {
  creatorShopCopy,
  fillShopCopy,
  type CreatorShopCopy,
} from "./creator-shop-copy";

/** Images in the first row load eagerly; the rest wait until scrolled near. */
const EAGER_IMAGES = 4;

/**
 * One product card. The whole card is the tracked `/r/{code}` link, so every
 * tap is recorded and attributed exactly like any other Xurjin link.
 */
export function ShopCard({
  item,
  copy,
  eager = true,
}: {
  item: PublicShopItem;
  copy: Pick<CreatorShopCopy, "opensShop">;
  eager?: boolean;
}) {
  return (
    <a
      className="creator-shop-card"
      href={`/r/${item.code}`}
      target="_blank"
      rel="sponsored noopener"
      aria-label={fillShopCopy(copy.opensShop, {
        brand: item.brandName,
        title: item.title,
      })}
    >
      <span className="creator-shop-image">
        <img
          src={item.imageUrl}
          alt=""
          width={400}
          height={400}
          {...(eager ? {} : { loading: "lazy" as const })}
          decoding="async"
        />
        <span className="creator-shop-badge" aria-hidden="true">
          {"↗"}
        </span>
      </span>
      <span className="creator-shop-brand">{item.brandName}</span>
      <span className="creator-shop-name">{item.title}</span>
    </a>
  );
}

export function CreatorShop({
  items,
  locale,
  action,
}: {
  items: PublicShopItem[];
  locale: Locale;
  /** Owner-only control beside the heading (never on the public page). */
  action?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  if (items.length === 0) return null;
  const copy = creatorShopCopy(locale);
  const remaining = items.length - SHOP_INITIAL_VISIBLE;
  const heading = (
    <h2 id="creator-shop-heading">
      {copy.heading} <span className="creator-shop-count">{items.length}</span>
    </h2>
  );
  function showMore() {
    setExpanded(true);
    // Move focus to the first newly revealed card so keyboard and screen
    // reader users continue where the list grew instead of on a removed button.
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelectorAll<HTMLAnchorElement>("a")
        [SHOP_INITIAL_VISIBLE]?.focus();
    });
  }
  return (
    <section
      className="creator-shop profile-section"
      aria-labelledby="creator-shop-heading"
    >
      {action ? (
        <div className="creator-shop-heading">
          {heading}
          {action}
        </div>
      ) : (
        heading
      )}
      <ul className="creator-shop-grid" ref={listRef}>
        {items.map((item, index) => (
          <li
            key={item.productId}
            hidden={!expanded && index >= SHOP_INITIAL_VISIBLE}
          >
            <ShopCard item={item} copy={copy} eager={index < EAGER_IMAGES} />
          </li>
        ))}
      </ul>
      {!expanded && remaining > 0 ? (
        <button
          type="button"
          className="creator-shop-more profile-button"
          onClick={showMore}
        >
          {fillShopCopy(copy.showMore, { count: remaining })}
        </button>
      ) : null}
      <p className="creator-shop-disclosure">{copy.disclosure}</p>
    </section>
  );
}
