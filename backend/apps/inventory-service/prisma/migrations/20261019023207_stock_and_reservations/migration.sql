-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'HELD', 'COMMITTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "MovementReason" AS ENUM ('RECEIPT', 'ADJUSTMENT', 'SALE', 'RETURN');

-- CreateTable
CREATE TABLE "inventory_items" (
    "variant_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "on_hand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("variant_id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "release_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservation_items" (
    "reservation_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "stock_reservation_items_pkey" PRIMARY KEY ("reservation_id","variant_id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "MovementReason" NOT NULL,
    "ref_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_reservations_order_id_key" ON "stock_reservations"("order_id");

-- CreateIndex
CREATE INDEX "stock_reservations_status_expires_at_idx" ON "stock_reservations"("status", "expires_at");

-- CreateIndex
CREATE INDEX "stock_movements_variant_id_created_at_idx" ON "stock_movements"("variant_id", "created_at");

-- AddForeignKey
ALTER TABLE "stock_reservation_items" ADD CONSTRAINT "stock_reservation_items_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "stock_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Stock integrity (not expressible in Prisma schema)
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_on_hand_nonnegative" CHECK ("on_hand" >= 0);
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_reserved_within_on_hand" CHECK ("reserved" >= 0 AND "reserved" <= "on_hand");
ALTER TABLE "stock_reservation_items" ADD CONSTRAINT "stock_reservation_items_qty_positive" CHECK ("qty" > 0);
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_delta_nonzero" CHECK ("delta" <> 0);
