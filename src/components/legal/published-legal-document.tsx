import type { LegalDocument } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { resolvePublishedLegalDocument } from "@/lib/legal/legal-document-store";

export async function PublishedLegalDocument({
  fallback,
  supplementalBlocks,
}: {
  fallback: LegalDocument;
  supplementalBlocks?: LegalDocument["blocks"];
}) {
  const resolved = await resolvePublishedLegalDocument(fallback.slug, fallback);
  return (
    <LegalDocumentView
      document={resolved.document}
      scheduledNotice={resolved.scheduledNotice}
      supplementalBlocks={supplementalBlocks}
    />
  );
}
