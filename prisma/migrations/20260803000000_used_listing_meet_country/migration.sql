-- Meet location country for map-engine selection (never store provider id)
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "meetCountry" VARCHAR(2);
