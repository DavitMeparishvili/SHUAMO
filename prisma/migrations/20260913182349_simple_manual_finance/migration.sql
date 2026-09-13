-- CreateEnum
CREATE TYPE "FinancePaymentKind" AS ENUM ('PAYMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "FinanceInvoicePartyKind" AS ENUM ('BRAND', 'CREATOR');

-- DropForeignKey
ALTER TABLE "integration_request" DROP CONSTRAINT "integration_request_brand_id_fkey";

-- DropIndex
DROP INDEX "product_discovery_idx";

-- AlterTable
ALTER TABLE "attribution" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "audit_event" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "conversion" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "conversion_item" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "finance_payment" (
    "id" UUID NOT NULL,
    "request_key" UUID NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "kind" "FinancePaymentKind" NOT NULL,
    "brand_id" UUID,
    "creator_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "transferred_on" DATE NOT NULL,
    "bank_reference" VARCHAR(160),
    "note" VARCHAR(1000),
    "party_snapshot" JSONB NOT NULL,
    "invoice_id" UUID,
    "reverses_id" UUID,
    "recorded_by_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_invoice" (
    "id" UUID NOT NULL,
    "request_key" UUID NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "preview_hash" CHAR(64) NOT NULL,
    "number" TEXT NOT NULL,
    "brand_id" UUID,
    "creator_id" UUID,
    "payer_snapshot" JSONB NOT NULL,
    "payee_snapshot" JSONB NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GEL',
    "issued_by_id" UUID NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_invoice_line" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "attribution_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "finance_invoice_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_invoice_counter" (
    "kind" "FinanceInvoicePartyKind" NOT NULL,
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL,

    CONSTRAINT "finance_invoice_counter_pkey" PRIMARY KEY ("kind","year")
);

-- CreateIndex
CREATE UNIQUE INDEX "finance_payment_request_key_key" ON "finance_payment"("request_key");

-- CreateIndex
CREATE UNIQUE INDEX "finance_payment_reverses_id_key" ON "finance_payment"("reverses_id");

-- CreateIndex
CREATE INDEX "finance_payment_brand_id_transferred_on_idx" ON "finance_payment"("brand_id", "transferred_on");

-- CreateIndex
CREATE INDEX "finance_payment_creator_id_transferred_on_idx" ON "finance_payment"("creator_id", "transferred_on");

-- CreateIndex
CREATE INDEX "finance_payment_invoice_id_idx" ON "finance_payment"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_invoice_request_key_key" ON "finance_invoice"("request_key");

-- CreateIndex
CREATE UNIQUE INDEX "finance_invoice_number_key" ON "finance_invoice"("number");

-- CreateIndex
CREATE INDEX "finance_invoice_brand_id_issued_at_idx" ON "finance_invoice"("brand_id", "issued_at");

-- CreateIndex
CREATE INDEX "finance_invoice_creator_id_issued_at_idx" ON "finance_invoice"("creator_id", "issued_at");

-- CreateIndex
CREATE INDEX "finance_invoice_line_attribution_id_idx" ON "finance_invoice_line"("attribution_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_invoice_line_invoice_id_attribution_id_key" ON "finance_invoice_line"("invoice_id", "attribution_id");

-- AddForeignKey
ALTER TABLE "integration_request" ADD CONSTRAINT "integration_request_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payment" ADD CONSTRAINT "finance_payment_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payment" ADD CONSTRAINT "finance_payment_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payment" ADD CONSTRAINT "finance_payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "finance_invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payment" ADD CONSTRAINT "finance_payment_reverses_id_fkey" FOREIGN KEY ("reverses_id") REFERENCES "finance_payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payment" ADD CONSTRAINT "finance_payment_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoice" ADD CONSTRAINT "finance_invoice_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoice" ADD CONSTRAINT "finance_invoice_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoice" ADD CONSTRAINT "finance_invoice_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoice_line" ADD CONSTRAINT "finance_invoice_line_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "finance_invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoice_line" ADD CONSTRAINT "finance_invoice_line_attribution_id_fkey" FOREIGN KEY ("attribution_id") REFERENCES "attribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE finance_payment
 ADD CONSTRAINT finance_payment_one_party CHECK ((brand_id IS NOT NULL)::int + (creator_id IS NOT NULL)::int = 1),
 ADD CONSTRAINT finance_payment_positive CHECK (amount > 0),
 ADD CONSTRAINT finance_payment_reversal_shape CHECK ((kind = 'PAYMENT' AND reverses_id IS NULL) OR (kind = 'REVERSAL' AND reverses_id IS NOT NULL AND note IS NOT NULL AND length(btrim(note)) > 0)),
 ADD CONSTRAINT finance_payment_not_self_reversal CHECK (reverses_id <> id);
ALTER TABLE finance_invoice
 ADD CONSTRAINT finance_invoice_one_party CHECK ((brand_id IS NOT NULL)::int + (creator_id IS NOT NULL)::int = 1),
 ADD CONSTRAINT finance_invoice_currency CHECK (currency = 'GEL');
ALTER TABLE finance_invoice_line ADD CONSTRAINT finance_invoice_line_nonzero CHECK (amount <> 0);
