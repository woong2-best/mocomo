-- CreateTable
CREATE TABLE "AnimeStar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimeStar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnimeStar_userId_animeId_key" ON "AnimeStar"("userId", "animeId");

-- CreateIndex
CREATE INDEX "AnimeStar_userId_createdAt_idx" ON "AnimeStar"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AnimeStar" ADD CONSTRAINT "AnimeStar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeStar" ADD CONSTRAINT "AnimeStar_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
