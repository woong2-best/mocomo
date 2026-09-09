-- 중고거래 로컬 서비스 지역 (동네 매칭)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "usedServiceRegion" TEXT;

-- 국가·지역별 목록 조회 가속
CREATE INDEX IF NOT EXISTS "UsedListing_meetCountry_region_status_idx"
  ON "UsedListing"("meetCountry", "region", "status");
