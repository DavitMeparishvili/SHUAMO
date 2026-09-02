CREATE TYPE "ConversionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'UNATTRIBUTED');

CREATE TABLE "conversion" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "brand_id" uuid NOT NULL,
  "order_id" text NOT NULL,
  "occurred_at" timestamptz(6) NOT NULL,
  "status" "ConversionStatus" NOT NULL DEFAULT 'PENDING',
  "confirmed_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "confirmed_at_matches_status"
    CHECK ((status = 'CONFIRMED') = (confirmed_at IS NOT NULL))
);

CREATE TABLE "conversion_item" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "conversion_id" uuid NOT NULL,
  "sku" text NOT NULL,
  "qty" integer NOT NULL,
  "unit_price" numeric(12,2) NOT NULL,
  "line_discount" numeric(12,2) NOT NULL,
  "line_vat" numeric(12,2) NOT NULL,
  "commissionable_net" numeric(12,2) NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversion_item_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversion_item_qty_positive" CHECK (qty > 0),
  CONSTRAINT "conversion_item_unit_price_non_neg" CHECK (unit_price >= 0),
  CONSTRAINT "conversion_item_discount_non_neg" CHECK (line_discount >= 0),
  CONSTRAINT "conversion_item_vat_non_neg" CHECK (line_vat >= 0),
  CONSTRAINT "conversion_item_net_non_neg" CHECK (commissionable_net >= 0)
);

CREATE TABLE "attribution" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "conversion_item_id" uuid NOT NULL,
  "click_id" text NOT NULL,
  "creator_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "commission_amount" numeric(12,2) NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attribution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attribution_amount_non_negative" CHECK (commission_amount >= 0)
);

CREATE TABLE "audit_event" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "actor_id" uuid,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "changes" jsonb NOT NULL DEFAULT '{}',
  "at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversion_brand_id_order_id_key"
  ON "conversion"("brand_id", "order_id");
CREATE INDEX "conversion_queue_idx"
  ON "conversion"("brand_id", "status", "confirmed_at");
CREATE INDEX "conversion_item_conversion_idx"
  ON "conversion_item"("conversion_id");
CREATE UNIQUE INDEX "attribution_conversion_item_id_key"
  ON "attribution"("conversion_item_id");
CREATE INDEX "attribution_creator_idx" ON "attribution"("creator_id");
CREATE INDEX "attribution_click_idx" ON "attribution"("click_id");
CREATE INDEX "audit_event_entity_idx"
  ON "audit_event"("entity_type", "entity_id", "at" DESC);

ALTER TABLE "conversion"
  ADD CONSTRAINT "conversion_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversion_item"
  ADD CONSTRAINT "conversion_item_conversion_id_fkey"
  FOREIGN KEY ("conversion_id") REFERENCES "conversion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attribution"
  ADD CONSTRAINT "attribution_conversion_item_id_fkey"
  FOREIGN KEY ("conversion_item_id") REFERENCES "conversion_item"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "attribution_click_id_fkey"
  FOREIGN KEY ("click_id") REFERENCES "click"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attribution_creator_id_fkey"
  FOREIGN KEY ("creator_id") REFERENCES "creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attribution_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_event"
  ADD CONSTRAINT "audit_event_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE FUNCTION prevent_attribution_amount_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.commission_amount IS DISTINCT FROM OLD.commission_amount THEN
    RAISE EXCEPTION 'attribution commission amount is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER attribution_amount_immutable
BEFORE UPDATE ON "attribution"
FOR EACH ROW
EXECUTE FUNCTION prevent_attribution_amount_update();
