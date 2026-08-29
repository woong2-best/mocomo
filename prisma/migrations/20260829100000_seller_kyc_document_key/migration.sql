-- KYC 신분증 이미지 (비공개 스토리지 키)
ALTER TABLE "MarketplaceSellerProfile"
  ADD COLUMN "kycDocumentKey" TEXT;
