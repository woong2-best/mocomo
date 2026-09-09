-- Scoped search keyword rankings (used, market, community, live, feed)
CREATE TABLE "ScopedSearchQuery" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "displayQuery" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScopedSearchQuery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScopedSearchQuery_scope_query_key" ON "ScopedSearchQuery"("scope", "query");
CREATE INDEX "ScopedSearchQuery_scope_count_idx" ON "ScopedSearchQuery"("scope", "count" DESC);
