ALTER TABLE "tracking_link"
  ADD COLUMN commission_type "RateType",
  ADD COLUMN commission_value numeric(9,4);

UPDATE tracking_link AS l
SET commission_type = p.commission_type,
    commission_value = p.commission_value
FROM product AS p
WHERE p.id = l.product_id;

ALTER TABLE "tracking_link"
  ALTER COLUMN commission_type SET NOT NULL,
  ALTER COLUMN commission_value SET NOT NULL,
  ADD CONSTRAINT tracking_link_commission_non_negative
    CHECK (commission_value >= 0),
  ADD CONSTRAINT tracking_link_percent_is_fraction
    CHECK (commission_type <> 'PERCENT' OR commission_value <= 1);

DROP INDEX "tracking_link_product_id_creator_id_key";

CREATE INDEX tracking_link_product_creator_idx
  ON tracking_link (product_id, creator_id);

CREATE UNIQUE INDEX tracking_link_one_active_product_creator
  ON tracking_link (product_id, creator_id)
  WHERE status = 'ACTIVE';

CREATE FUNCTION prevent_tracking_link_agreement_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.creator_id IS DISTINCT FROM OLD.creator_id
     OR NEW.code IS DISTINCT FROM OLD.code
     OR NEW.commission_type IS DISTINCT FROM OLD.commission_type
     OR NEW.commission_value IS DISTINCT FROM OLD.commission_value THEN
    RAISE EXCEPTION 'tracking link identity and commission terms are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tracking_link_agreement_immutable
BEFORE UPDATE ON tracking_link
FOR EACH ROW
EXECUTE FUNCTION prevent_tracking_link_agreement_update();
