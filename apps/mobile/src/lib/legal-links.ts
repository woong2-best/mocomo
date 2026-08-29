/** MoCoMo legal docs — paths match `src/lib/legal-content.ts` on web. */
export type LegalLink = {
  label: string;
  path: string;
};

export const LEGAL_POLICY_LINKS: LegalLink[] = [
  { label: "이용약관", path: "/legal/terms" },
  { label: "AUP (Acceptable Use Policy)", path: "/legal/aup" },
  { label: "크리에이터 약관", path: "/legal/creator-terms" },
  { label: "결제 및 환불 정책", path: "/legal/payment" },
  { label: "저작권 정책", path: "/legal/copyright" },
  { label: "개인정보처리방침", path: "/legal/privacy" },
  { label: "운영원칙 및 이용정책", path: "/legal/policy" },
];
