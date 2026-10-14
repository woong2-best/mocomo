/** MoCoMo legal docs — paths match `src/lib/legal-content.ts` on web. */
export type LegalLink = {
  labelKey: string;
  path: string;
};

export const LEGAL_POLICY_LINKS: LegalLink[] = [
  { labelKey: "legal.aup", path: "/legal/aup" },
  { labelKey: "legal.cultureWiki", path: "/legal/culture-wiki" },
  { labelKey: "legal.communityQnaTerms", path: "/legal/community-qna-terms" },
  { labelKey: "legal.mocoTransfers", path: "/legal/moco-transfers" },
  { labelKey: "legal.purchaseTerms", path: "/legal/purchase" },
  { labelKey: "legal.terms", path: "/legal/terms" },
  { labelKey: "legal.creatorTerms", path: "/legal/creator-terms" },
  { labelKey: "legal.qna", path: "/legal/qna" },
  { labelKey: "legal.sellerTerms", path: "/legal/seller-terms" },
  { labelKey: "legal.sponsoredContent", path: "/legal/sponsored-content" },
  { labelKey: "legal.payment", path: "/legal/payment" },
  { labelKey: "legal.copyright", path: "/legal/copyright" },
  { labelKey: "legal.privacy", path: "/legal/privacy" },
  { labelKey: "legal.accountDeletion", path: "/legal/account-deletion" },
  { labelKey: "legal.moderation", path: "/legal/moderation" },
  { labelKey: "legal.policy", path: "/legal/policy" },
];
