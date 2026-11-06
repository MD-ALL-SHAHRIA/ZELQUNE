-- A committed (paid) reservation whose order is cancelled is put back on hand exactly once.
ALTER TABLE "stock_reservations" ADD COLUMN "restocked_at" TIMESTAMPTZ(3);
