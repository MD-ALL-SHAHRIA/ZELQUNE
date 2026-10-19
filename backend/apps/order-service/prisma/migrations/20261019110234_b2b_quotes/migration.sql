-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('NEW', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'NEW',
    "organization_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "needed_by" DATE,
    "customization_notes" TEXT,
    "notes" TEXT,
    "utm" JSONB,
    "shipping_fee_paisa" INTEGER,
    "advance_required_paisa" INTEGER,
    "valid_until" TIMESTAMPTZ(3),
    "quoted_at" TIMESTAMPTZ(3),
    "quoted_by" TEXT,
    "decision_reason" TEXT,
    "order_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_lines" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "requested_product_slug" TEXT,
    "requested_variant_id" UUID,
    "qty" INTEGER NOT NULL,
    "variant_id" UUID,
    "product_id" UUID,
    "sku" TEXT,
    "name_bn" TEXT,
    "name_en" TEXT,
    "options" JSONB,
    "sale_mode" "SaleMode",
    "unit_price_paisa" INTEGER,
    "retail_price_paisa" INTEGER,

    CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_code_key" ON "quotes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_order_id_key" ON "quotes"("order_id");

-- CreateIndex
CREATE INDEX "quotes_status_created_at_idx" ON "quotes"("status", "created_at");

-- CreateIndex
CREATE INDEX "quote_lines_quote_id_idx" ON "quote_lines"("quote_id");

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Quantity and money integrity
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_qty_range" CHECK ("qty" BETWEEN 1 AND 100000);
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_price_nonnegative" CHECK ("unit_price_paisa" IS NULL OR "unit_price_paisa" >= 0);
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_amounts_nonnegative" CHECK (coalesce("shipping_fee_paisa", 0) >= 0 AND coalesce("advance_required_paisa", 0) >= 0);
