import type { LegalBlock, LegalDocument } from "@/lib/legal-content";
import {
  ACCEPTABLE_USE_POLICY,
  COMMUNITY_POLICY,
  COPYRIGHT_POLICY,
  CREATOR_TERMS,
  PAYMENT_REFUND_POLICY,
  TERMS_OF_SERVICE,
} from "@/lib/legal-content";
import { getTermsSupplementalBlocks } from "@/lib/legal-supplemental-clauses";
import { resolvePublishedLegalDocument } from "@/lib/legal/legal-document-store";

function sectionBlocks(doc: LegalDocument): LegalBlock[] {
  return [
    { type: "hr" },
    { type: "h2", text: doc.title },
    ...(doc.intro ? [{ type: "p" as const, text: doc.intro }] : []),
    ...doc.blocks,
  ];
}

/** Signup “이용약관 보기” — main ToS plus AUP, creator, copyright, payment, operations. */
export async function buildUnifiedTermsDocument(countryCode: string): Promise<{
  document: LegalDocument;
  scheduledNotice: { effectiveDate: string; title: string } | null;
}> {
  const supplemental = getTermsSupplementalBlocks(countryCode);
  const [tos, aup, creator, copyright, payment, community] = await Promise.all([
    resolvePublishedLegalDocument("terms", TERMS_OF_SERVICE),
    resolvePublishedLegalDocument("aup", ACCEPTABLE_USE_POLICY),
    resolvePublishedLegalDocument("creator-terms", CREATOR_TERMS),
    resolvePublishedLegalDocument("copyright", COPYRIGHT_POLICY),
    resolvePublishedLegalDocument("payment", PAYMENT_REFUND_POLICY),
    resolvePublishedLegalDocument("policy", COMMUNITY_POLICY),
  ]);
  const scheduledNotice =
    [tos, aup, creator, copyright, payment, community]
      .map((item) => item.scheduledNotice)
      .filter((notice): notice is { effectiveDate: string; title: string } => notice != null)
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))[0] ?? null;
  return {
    document: {
      slug: "terms",
      title: "MoCoMo Unified Terms of Service",
      updatedAt: tos.document.updatedAt,
      intro:
        "Terms you agree to when signing up. Includes the Terms of Service, Acceptable Use Policy (AUP), creator terms, copyright, payment and refunds, and community guidelines.",
      blocks: [
        ...tos.document.blocks,
        ...supplemental,
        ...sectionBlocks(aup.document),
        ...sectionBlocks(creator.document),
        ...sectionBlocks(copyright.document),
        ...sectionBlocks(payment.document),
        ...sectionBlocks(community.document),
      ],
    },
    scheduledNotice,
  };
}
