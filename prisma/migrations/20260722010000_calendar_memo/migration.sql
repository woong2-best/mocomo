-- CreateTable
CREATE TABLE "CalendarMemo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarMemo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarMemo_userId_dateKey_idx" ON "CalendarMemo"("userId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarMemo_userId_dateKey_key" ON "CalendarMemo"("userId", "dateKey");

-- AddForeignKey
ALTER TABLE "CalendarMemo" ADD CONSTRAINT "CalendarMemo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
