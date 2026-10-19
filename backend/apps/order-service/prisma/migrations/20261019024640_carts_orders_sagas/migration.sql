-- CreateEnum
CREATE TYPE "SaleMode" AS ENUM ('IN_STOCK', 'MADE_TO_ORDER', 'PRE_ORDER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BKASH_MANUAL', 'NAGAD_MANUAL');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT');

-- CreateEnum
CREATE TYPE "SagaStatus" AS ENUM ('STARTED', 'STOCK_RESERVED', 'PAYMENT_CREATED', 'COMPLETED', 'COMPENSATING', 'COMPENSATED', 'FAILED');

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "experiment_key" TEXT,
    "order_id" UUID,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "cart_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "added_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("cart_id","variant_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "cart_id" UUID NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "address" JSONB NOT NULL,
    "sale_mode" "SaleMode" NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "subtotal_paisa" INTEGER NOT NULL,
    "discount_paisa" INTEGER NOT NULL DEFAULT 0,
    "shipping_fee_paisa" INTEGER NOT NULL,
    "total_paisa" INTEGER NOT NULL,
    "advance_required_paisa" INTEGER NOT NULL,
    "shipping_zone" TEXT NOT NULL,
    "chargeable_weight_grams" INTEGER NOT NULL,
    "experiment_key" TEXT,
    "utm" JSONB,
    "cancel_reason" TEXT,
    "confirmed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name_bn" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "sale_mode" "SaleMode" NOT NULL,
    "unit_price_paisa" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "line_total_paisa" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_changes" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "from" "OrderStatus",
    "to" "OrderStatus" NOT NULL,
    "actor" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_sagas" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" "SagaStatus" NOT NULL,
    "stock_reserved" BOOLEAN NOT NULL DEFAULT false,
    "payment_created" BOOLEAN NOT NULL DEFAULT false,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "checkout_sagas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carts_token_hash_key" ON "carts"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "carts_order_id_key" ON "carts"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_cart_id_key" ON "orders"("cart_id");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "orders_customer_phone_idx" ON "orders"("customer_phone");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_status_changes_order_id_idx" ON "order_status_changes"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_sagas_code_key" ON "checkout_sagas"("code");

-- CreateIndex
CREATE INDEX "checkout_sagas_status_updated_at_idx" ON "checkout_sagas"("status", "updated_at");

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_changes" ADD CONSTRAINT "order_status_changes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Money and quantity integrity (not expressible in Prisma schema)
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_qty_range" CHECK ("qty" BETWEEN 1 AND 10);
ALTER TABLE "orders" ADD CONSTRAINT "orders_amounts_nonnegative" CHECK ("subtotal_paisa" >= 0 AND "discount_paisa" >= 0 AND "shipping_fee_paisa" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_consistent" CHECK ("total_paisa" = "subtotal_paisa" - "discount_paisa" + "shipping_fee_paisa");
ALTER TABLE "orders" ADD CONSTRAINT "orders_advance_within_total" CHECK ("advance_required_paisa" >= 0 AND "advance_required_paisa" <= "total_paisa");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_line_consistent" CHECK ("qty" > 0 AND "unit_price_paisa" >= 0 AND "line_total_paisa" = "unit_price_paisa" * "qty");
