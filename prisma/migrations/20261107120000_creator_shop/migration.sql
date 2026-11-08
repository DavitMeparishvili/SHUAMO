-- CreateTable
CREATE TABLE "creator_shop_item" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "creator_shop_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "creator_shop_item_position_idx" ON "creator_shop_item"("creator_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "creator_shop_item_creator_id_product_id_key" ON "creator_shop_item"("creator_id", "product_id");

-- AddForeignKey
ALTER TABLE "creator_shop_item" ADD CONSTRAINT "creator_shop_item_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_shop_item" ADD CONSTRAINT "creator_shop_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
