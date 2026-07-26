-- AlterTable
ALTER TABLE "PostMedia" ADD COLUMN "hlsUrl" TEXT;
ALTER TABLE "PostMedia" ADD COLUMN "posterUrl" TEXT;
ALTER TABLE "PostMedia" ADD COLUMN "streamUid" TEXT;

-- CreateIndex
CREATE INDEX "PostMedia_streamUid_idx" ON "PostMedia"("streamUid");
