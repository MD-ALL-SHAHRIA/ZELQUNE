-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('B2C', 'B2B');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "channel" "OrderChannel" NOT NULL DEFAULT 'B2C',
ADD COLUMN     "organization_id" UUID,
ADD COLUMN     "session_id" TEXT,
ALTER COLUMN "cart_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "checkout_sagas" ADD COLUMN     "quote_id" UUID,
ALTER COLUMN "cart_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "order_notes" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "phone" TEXT NOT NULL,
    "is_friend" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("phone")
);

-- CreateIndex
CREATE INDEX "order_notes_order_id_idx" ON "order_notes"("order_id");

-- CreateIndex
CREATE INDEX "orders_channel_created_at_idx" ON "orders"("channel", "created_at");

-- AddForeignKey
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Storefront orders always come from a cart; only B2B orders (from quotes) may lack one.
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_unless_b2b" CHECK ("cart_id" IS NOT NULL OR "channel" = 'B2B');

-- The storefront line cap is now configuration (MAX_LINE_QTY_B2C, default 10); keep a sanity bound.
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_qty_range";
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_qty_range" CHECK ("qty" BETWEEN 1 AND 100);
