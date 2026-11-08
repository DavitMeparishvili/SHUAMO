"use client";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import type { Locale } from "@/src/modules/localization";
import type { ShopActionResult } from "../application/creator-shop-input";
import { creatorShopCopy } from "./creator-shop-copy";

/**
 * "Add to shop" / "✓ In shop" on a creator's link card. Saves immediately,
 * shows the new state optimistically, and rolls back if the save fails.
 */
export function ShopToggleButton({
  productId,
  inShop,
  locale,
  add,
  remove,
}: {
  productId: string;
  inShop: boolean;
  locale: Locale;
  add(ids: string[]): Promise<ShopActionResult>;
  remove(id: string): Promise<ShopActionResult>;
}) {
  const copy = creatorShopCopy(locale);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // `saved` follows the server value whenever the page re-renders.
  const [saved, setSaved] = useState(inShop);
  const [previous, setPrevious] = useState(inShop);
  if (inShop !== previous) {
    setPrevious(inShop);
    setSaved(inShop);
  }
  const [shown, setShown] = useOptimistic(saved);
  const [failedTarget, setFailedTarget] = useState<boolean | null>(null);

  function save(target: boolean) {
    setFailedTarget(null);
    startTransition(async () => {
      setShown(target);
      let result: ShopActionResult | { ok: false };
      try {
        result = await (target ? add([productId]) : remove(productId));
      } catch {
        result = { ok: false };
      }
      if (result.ok) {
        startTransition(() => setSaved(target));
        return;
      }
      setFailedTarget(target);
      router.refresh();
    });
  }

  return (
    <span className="shop-toggle">
      <button
        type="button"
        className={`shop-toggle-button${shown ? " is-in-shop" : ""}`}
        aria-pressed={shown}
        disabled={pending}
        onClick={() => save(!shown)}
      >
        {shown ? (
          <>
            <span aria-hidden="true">{"✓ "}</span>
            {copy.inShop}
          </>
        ) : (
          copy.addToShop
        )}
      </button>
      {failedTarget !== null ? (
        <span className="shop-toggle-error" role="status">
          <span>{copy.failed}</span>
          <button
            type="button"
            className="shop-text-button"
            onClick={() => save(failedTarget)}
          >
            {copy.retry}
          </button>
        </span>
      ) : null}
    </span>
  );
}
