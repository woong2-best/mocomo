CREATE TYPE "LegalDocumentStatus" AS ENUM ('LIVE', 'SCHEDULED', 'SUPERSEDED');

CREATE TABLE "legal_document_revision" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "bodyText" TEXT NOT NULL,
    "versionLabel" TEXT,
    "status" "LegalDocumentStatus" NOT NULL,
    "scheduledPublishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "triggerTermsPopup" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_document_revision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "legal_document_revision_slug_status_idx" ON "legal_document_revision"("slug", "status");
CREATE INDEX "legal_document_revision_status_scheduledPublishAt_idx" ON "legal_document_revision"("status", "scheduledPublishAt");
