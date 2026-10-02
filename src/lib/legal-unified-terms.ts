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

function sectionBlocks(doc: LegalDocument): LegalBlock[] {
  return [
    { type: "hr" },
    { type: "h2", text: doc.title },
    ...(doc.intro ? [{ type: "p" as const, text: doc.intro }] : []),
    ...doc.blocks,
  ];
}

/** Signup “이용약관 보기” — main ToS plus AUP, creator, copyright, payment, operations. */
export function buildUnifiedTermsDocument(countryCode: string): LegalDocument {
  const supplemental = getTermsSupplementalBlocks(countryCode);
  return {
    slug: "terms",
    title: "MoCoMo Unified Terms of Service",
    updatedAt: TERMS_OF_SERVICE.updatedAt,
    intro:
      "Terms you agree to when signing up. Includes the Terms of Service, Acceptable Use Policy (AUP), creator terms, copyright, payment and refunds, and community guidelines.",
    blocks: [
      ...TERMS_OF_SERVICE.blocks,
      ...supplemental,
      ...sectionBlocks(ACCEPTABLE_USE_POLICY),
      ...sectionBlocks(CREATOR_TERMS),
      ...sectionBlocks(COPYRIGHT_POLICY),
      ...sectionBlocks(PAYMENT_REFUND_POLICY),
      ...sectionBlocks(COMMUNITY_POLICY),
    ],
  };
}
