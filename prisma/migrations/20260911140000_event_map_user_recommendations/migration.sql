-- CreateTable
CREATE TABLE "EventMapUserRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMapUserRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventMapUserRecommendation_userId_idx" ON "EventMapUserRecommendation"("userId");

-- CreateIndex
CREATE INDEX "EventMapUserRecommendation_createdAt_idx" ON "EventMapUserRecommendation"("createdAt");

-- AddForeignKey
ALTER TABLE "EventMapUserRecommendation" ADD CONSTRAINT "EventMapUserRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
