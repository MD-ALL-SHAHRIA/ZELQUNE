-- CreateEnum
CREATE TYPE "QuoteKind" AS ENUM ('PRODUCT', 'DESIGN');

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "design_budget" TEXT,
ADD COLUMN     "design_district" TEXT,
ADD COLUMN     "design_size_sqft" INTEGER,
ADD COLUMN     "design_space_type" TEXT,
ADD COLUMN     "kind" "QuoteKind" NOT NULL DEFAULT 'PRODUCT',
ALTER COLUMN "organization_name" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "quotes_kind_created_at_idx" ON "quotes"("kind", "created_at");


-- Business rules (ADR 0014): product requests name the company; design requests describe the space.
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_kind_fields_check" CHECK (
  ("kind" = 'PRODUCT' AND "organization_name" IS NOT NULL)
  OR ("kind" = 'DESIGN' AND "design_space_type" IS NOT NULL)
);
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_design_size_check"
  CHECK ("design_size_sqft" IS NULL OR "design_size_sqft" > 0);
