-- The order emails show the first product's photo; its slug is kept with the contact.
ALTER TABLE "order_contacts" ADD COLUMN "product_slug" TEXT;
