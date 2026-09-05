BEGIN;

ALTER TABLE conversion DROP CONSTRAINT confirmed_at_matches_status;
ALTER TABLE conversion ALTER COLUMN status DROP DEFAULT;

-- Existing records are test sales. Preserve history while removing the obsolete
-- review state and keeping attribution independent from order status.
UPDATE conversion
SET status = 'CONFIRMED'
WHERE status IN ('PENDING', 'UNATTRIBUTED');
UPDATE conversion SET confirmed_at = created_at WHERE confirmed_at IS NULL;

ALTER TYPE "ConversionStatus" RENAME TO "ConversionStatus_old";
CREATE TYPE "ConversionStatus" AS ENUM ('CONFIRMED', 'CANCELLED');
ALTER TABLE conversion ALTER COLUMN status TYPE "ConversionStatus"
  USING status::text::"ConversionStatus";
DROP TYPE "ConversionStatus_old";
ALTER TABLE conversion ALTER COLUMN status SET DEFAULT 'CONFIRMED';
ALTER TABLE conversion ALTER COLUMN confirmed_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE conversion ALTER COLUMN confirmed_at SET NOT NULL;

COMMIT;
