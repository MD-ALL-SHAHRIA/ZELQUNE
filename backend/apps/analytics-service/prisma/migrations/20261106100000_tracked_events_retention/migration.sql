-- Raw storefront visit events are kept 90 days (retention sweep); this index serves the delete.
CREATE INDEX "tracked_events_occurred_at_idx" ON "tracked_events"("occurred_at");
