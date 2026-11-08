import { z } from "zod";
import type { ShopWriteResult } from "../domain/creator-shop";

/** The most products one "add" may name (one picker selection). */
const SHOP_ADD_LIMIT = 200;
/**
 * A reorder names every item in the shop. The shop itself has no limit, so
 * this is only a guard against absurd payloads, far above any real shop.
 */
const SHOP_ORDER_LIMIT = 2000;

export const shopProductIdSchema = z.uuid();

const distinctIds = (limit: number) =>
  z
    .array(shopProductIdSchema)
    .min(1)
    .max(limit)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "duplicate_product",
    });

export const shopProductIdsSchema = distinctIds(SHOP_ADD_LIMIT);
export const shopOrderSchema = distinctIds(SHOP_ORDER_LIMIT);

export type ShopActionResult =
  ShopWriteResult | { ok: false; error: "unauthenticated" | "invalid" };
