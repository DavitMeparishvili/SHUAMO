-- Preserve existing hand-authored defaults and indexes omitted by Prisma's schema diff.
ALTER TABLE attribution ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE audit_event ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE conversion ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE conversion_item ALTER COLUMN id SET DEFAULT gen_random_uuid();
CREATE INDEX product_discovery_idx ON product (status, product_type, created_at DESC);
ALTER TABLE integration_request DROP CONSTRAINT integration_request_brand_id_fkey;
ALTER TABLE integration_request ADD CONSTRAINT integration_request_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES brand(id) ON DELETE CASCADE;
