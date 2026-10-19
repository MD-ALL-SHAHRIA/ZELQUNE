-- DropIndex
DROP INDEX "prices_variant_id_starts_at_idx";

-- AlterTable
ALTER TABLE "prices" ADD COLUMN     "price_list_id" TEXT NOT NULL DEFAULT 'RETAIL';

-- CreateIndex
CREATE INDEX "prices_variant_id_price_list_id_starts_at_idx" ON "prices"("variant_id", "price_list_id", "starts_at");

