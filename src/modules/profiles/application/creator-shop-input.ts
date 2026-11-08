import { z } from "zod";
import type { ShopWriteResult } from "../infrastructure/prisma-creator-shop-repository";

/** The most products one shop write may name; also the reorder ceiling. */
const SHOP_WRITE_LIMIT = 200;

export const shopProductIdSchema = z.uuid();

export const shopProductIdsSchema = z
  .array(shopProductIdSchema)
  .min(1)
  .max(SHOP_WRITE_LIMIT)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "duplicate_product",
  });

export type ShopActionResult =
  ShopWriteResult | { ok: false; error: "unauthenticated" | "invalid" };
