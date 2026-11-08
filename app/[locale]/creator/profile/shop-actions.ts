"use server";
import { revalidatePath } from "next/cache";
import { currentViewer, requireCreator } from "@/src/modules/identity";
import { isLocale, type Locale } from "@/src/modules/localization";
import {
  addShopItems,
  removeShopItem,
  reorderShopItems,
  setShopItemVisible,
  shopOrderSchema,
  shopProductIdSchema,
  shopProductIdsSchema,
  type ShopActionResult,
} from "@/src/modules/profiles";

// Shop writes go live immediately: they never touch the profile draft, so
// only the editor and the Links page (its "In shop" toggles) need refreshing.
// The public profile is rendered dynamically on every request.
function revalidateShop(locale: Locale) {
  revalidatePath(`/${locale}/creator/profile`);
  revalidatePath(`/${locale}/creator/links`);
}

async function creatorIdFor(): Promise<string | null> {
  const allowed = requireCreator(await currentViewer());
  return allowed.ok ? allowed.value.creatorId : null;
}

export async function addShopItemsAction(
  locale: Locale,
  productIds: string[],
): Promise<ShopActionResult> {
  const creatorId = await creatorIdFor();
  if (creatorId === null) return { ok: false, error: "unauthenticated" };
  const parsed = shopProductIdsSchema.safeParse(productIds);
  if (!isLocale(locale) || !parsed.success)
    return { ok: false, error: "invalid" };
  const result = await addShopItems(creatorId, parsed.data);
  if (result.ok) revalidateShop(locale);
  return result;
}

export async function removeShopItemAction(
  locale: Locale,
  productId: string,
): Promise<ShopActionResult> {
  const creatorId = await creatorIdFor();
  if (creatorId === null) return { ok: false, error: "unauthenticated" };
  const parsed = shopProductIdSchema.safeParse(productId);
  if (!isLocale(locale) || !parsed.success)
    return { ok: false, error: "invalid" };
  const result = await removeShopItem(creatorId, parsed.data);
  if (result.ok) revalidateShop(locale);
  return result;
}

export async function setShopItemVisibleAction(
  locale: Locale,
  productId: string,
  visible: boolean,
): Promise<ShopActionResult> {
  const creatorId = await creatorIdFor();
  if (creatorId === null) return { ok: false, error: "unauthenticated" };
  const parsed = shopProductIdSchema.safeParse(productId);
  if (!isLocale(locale) || !parsed.success || typeof visible !== "boolean")
    return { ok: false, error: "invalid" };
  const result = await setShopItemVisible(creatorId, parsed.data, visible);
  if (result.ok) revalidateShop(locale);
  return result;
}

export async function reorderShopItemsAction(
  locale: Locale,
  orderedProductIds: string[],
): Promise<ShopActionResult> {
  const creatorId = await creatorIdFor();
  if (creatorId === null) return { ok: false, error: "unauthenticated" };
  const parsed = shopOrderSchema.safeParse(orderedProductIds);
  if (!isLocale(locale) || !parsed.success)
    return { ok: false, error: "invalid" };
  const result = await reorderShopItems(creatorId, parsed.data);
  if (result.ok) revalidateShop(locale);
  return result;
}
