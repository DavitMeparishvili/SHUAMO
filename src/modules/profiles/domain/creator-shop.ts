/** Why a shop item can or cannot appear on the public profile. */
export type ShopAvailability =
  "available" | "unavailable" | "not-started" | "ended" | "no-photo";

/** The facts about an item's product and link that decide its availability. */
export interface ShopItemFacts {
  linkActive: boolean;
  productActive: boolean;
  offerStartsAt: Date | null;
  offerEndsAt: Date | null;
  imageCount: number;
}

/** How many shop items render before the "Show more" button. */
export const SHOP_INITIAL_VISIBLE = 12;

/**
 * Decide whether an item can be shown publicly, and if not, why. The order is
 * fixed: an unusable link or product outranks the offer window, which
 * outranks a missing photo.
 */
export function shopAvailability(
  facts: ShopItemFacts,
  now: Date,
): ShopAvailability {
  if (!facts.linkActive || !facts.productActive) return "unavailable";
  if (facts.offerStartsAt !== null && facts.offerStartsAt > now) {
    return "not-started";
  }
  if (facts.offerEndsAt !== null && facts.offerEndsAt <= now) return "ended";
  if (facts.imageCount === 0) return "no-photo";
  return "available";
}

/** The creator's choice and the item's availability must both allow it. */
export function isPubliclyShown(
  visible: boolean,
  availability: ShopAvailability,
): boolean {
  return visible && availability === "available";
}

export type ShopMove = "top" | "up" | "down" | "bottom";

/** Return a reordered copy; out-of-range or no-op moves return a plain copy. */
export function moveShopItem<T>(
  items: readonly T[],
  index: number,
  move: ShopMove,
): T[] {
  const next = [...items];
  if (!Number.isInteger(index) || index < 0 || index >= next.length) {
    return next;
  }
  const target =
    move === "top"
      ? 0
      : move === "up"
        ? index - 1
        : move === "down"
          ? index + 1
          : next.length - 1;
  if (target < 0 || target >= next.length || target === index) return next;
  const [item] = next.splice(index, 1) as [T];
  next.splice(target, 0, item);
  return next;
}

/** True iff `ordered` is a permutation of `current` with no duplicates. */
export function isSameIdSet(
  current: readonly string[],
  ordered: readonly string[],
): boolean {
  if (current.length !== ordered.length) return false;
  const orderedSet = new Set(ordered);
  if (orderedSet.size !== ordered.length) return false;
  return current.every((id) => orderedSet.has(id));
}
