/** MoCoMo legal docs — paths match `src/lib/legal-content.ts` on web. */
export type LegalLink = {
  labelKey: string;
  path: string;
};

export const LEGAL_POLICY_LINKS: LegalLink[] = [
  { labelKey: "legal.terms", path: "/legal/terms" },
  { labelKey: "legal.communityQnaTerms", path: "/legal/community-qna-terms" },
  { labelKey: "legal.aup", path: "/legal/aup" },
  { labelKey: "legal.creatorTerms", path: "/legal/creator-terms" },
  { labelKey: "legal.qna", path: "/legal/qna" },
  { labelKey: "legal.payment", path: "/legal/payment" },
  { labelKey: "legal.copyright", path: "/legal/copyright" },
  { labelKey: "legal.privacy", path: "/legal/privacy" },
  { labelKey: "legal.policy", path: "/legal/policy" },
];
