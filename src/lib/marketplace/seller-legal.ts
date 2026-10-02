import type { LegalDocument } from "@/lib/legal-content";
import { MARKET_BRAND_FULL } from "@/lib/market-brand";

/** More Commerce Moment 판매자 서비스 이용약관 (사업자용) — ver 1.1 */
export const SELLER_TERMS: LegalDocument = {
  slug: "seller-terms",
  title: `${MARKET_BRAND_FULL} 판매자 서비스 이용약관`,
  updatedAt: "August 29, 2026",
  intro:
    `본 약관은 미합중국 와이오밍 주 소재 MoCoMo LLC(이하 "회사")가 운영하는 온라인 오픈마켓 플랫폼 "${MARKET_BRAND_FULL}"(이하 "플랫폼")을 통해 상품을 판매하고자 하는 사업자(이하 "판매자")와 회사 간의 권리, 의무 및 책임사항, 서비스 이용 조건과 절차 등을 규정함을 목적으로 합니다. 판매자는 회원가입 시 본 약관에 동의함으로써 본 약관의 적용을 받습니다.`,
  blocks: [
    { type: "h2", text: "Chapter 1 General provisions" },
    { type: "h3", text: "Article 1 (Purpose)" },
    {
      type: "p",
      text: "Please check your input and try again.",
    },
    { type: "h3", text: "Article 2 (Definitions)" },
    {
      type: "p",
      text: "Terms used in these Terms are defined below; undefined terms follow applicable laws and general commercial practice.",
    },
    {
      type: "ul",
      items: [
        '"Platform" means all online buying and selling intermediary services operated by the Company, including its website and mobile applications.',
        '"Seller" means a business that agrees to these Terms, enters into a service agreement with the Company, and sells products through the Platform.',
        '"Buyer" means a member who purchases products listed by a Seller through the Platform.',
        'Please check your input and try again.',
        '"Service Fee" means amounts Sellers pay the Company as consideration for using the Platform.',
      ],
    },
    { type: "hr" },

    { type: "h2", text: "Chapter 2 Service agreement" },
    { type: "h3", text: "Article 3 (Formation of the service agreement)" },
    {
      type: "p",
      text: "Please sign in to continue.",
    },
    {
      type: "p",
      text: "The Company may reject or defer registration for Seller eligibility checks, identity or business verification (KYC), legal compliance, or similar reasons.",
    },
    { type: "h3", text: "Article 4 (Seller account management)" },
    {
      type: "p",
      text: "The Seller account uses the same MoCoMo member account; Sellers must not transfer, lend, or share account credentials or verification methods with third parties.",
    },
    {
      type: "p",
      text: "If contact details, business information, or payout information change, Sellers must update them promptly in Seller Center.",
    },
    { type: "hr" },

    { type: "h2", text: "Chapter 3 Product listings and sales" },
    { type: "h3", text: "Article 5 (Product listings)" },
    {
      type: "p",
      text: "판매자는 판매자센터를 통해 상품을 등록할 수 있으며, 상품 정보(명칭, 가격, 재고, 배송·제작 조건, 디지털 제공 방식 등)를 정확하고 최신 상태로 유지해야 합니다.",
    },
    { type: "h3", text: "Article 6 (Seller obligations)" },
    {
      type: "ul",
      items: [
        "Comply with applicable laws, these Terms, and Company operating policies",
        "Not use false or misleading advertising toward Buyers",
        "Fulfill shipping, production, or digital delivery within the promised timeframe after order confirmation",
        "Not infringe third-party intellectual property, portrait rights, or similar rights",
        "Respond in good faith to customer inquiries and disputes",
      ],
    },
    { type: "h3", text: "Article 7 (Prohibited conduct)" },
    {
      type: "ul",
      items: [
        "Selling illegal or harmful products or services",
        "Listing, selling, or paid transactions involving adult or NSFW content (including in-platform payment and settlement)",
        "Payment circumvention, off-platform deals, sham transactions, review manipulation",
        "Misusing another person's account, payment method, or personal information",
        "Interfering with Platform systems or security",
        "Other conduct that harms the Company or Buyers",
      ],
    },
    { type: "hr" },

    { type: "h2", text: "Chapter 4 Fees and settlement" },
    { type: "h3", text: "Article 8 (Service fees)" },
    {
      type: "p",
      text: "The Company may charge Sellers service fees for Platform use; fee rates and billing criteria are announced in Seller Center or separate notices.",
    },
    { type: "h3", text: "Article 9 (Settlement)" },
    {
      type: "p",
      text: "판매 대금은 회사가 정한 정산 주기·절차 및 결제 대행(예: Stripe Connect) 정책에 따라 지급됩니다. 판매자는 정확한 정산 계좌·수취 정보를 등록·유지해야 합니다.",
    },
    {
      type: "p",
      text: "If there are buyer claims, refunds, chargebacks, disputes, or Terms violations, the Company may hold, offset, or delay settlement of the relevant amounts.",
    },
    { type: "hr" },

    { type: "h2", text: "Chapter 5 Termination and liability" },
    { type: "h3", text: "Article 10 (Termination and restrictions)" },
    {
      type: "p",
      text: "Sellers may request termination of Seller status at any time; the Company may defer termination if orders, payouts, or disputes are in progress.",
    },
    {
      type: "p",
      text: "If Terms violations, legal violations, or trust-damaging conduct is confirmed, the Company may restrict selling, hold settlement, terminate the agreement, or take other necessary measures.",
    },
    { type: "h3", text: "Article 11 (Limitation of liability)" },
    {
      type: "p",
      text: "You don't have permission to do that.",
    },
    {
      type: "p",
      text: "판매자와 구매자 간 거래로 발생한 분쟁의 일차적 책임은 해당 당사자에게 있으며, 회사는 관련 법령 및 정책에 따라 분쟁 조정을 지원할 수 있습니다.",
    },
    { type: "hr" },

    { type: "h2", text: "Chapter 6 Miscellaneous" },
    { type: "h3", text: "Article 12 (Changes to these Terms)" },
    {
      type: "p",
      text: "Please check your input and try again.",
    },
    { type: "h3", text: "Article 13 (Governing law and jurisdiction)" },
    {
      type: "p",
      text: "본 약관 및 플랫폼과 관련된 사항에는 미합중국 와이오밍 주(State of Wyoming, United States of America)의 법률이 적용됩니다(법률 충돌 원칙은 제외). 분쟁에 관하여 소송이 제기되는 경우 와이오밍 주 관할 법원을 전속 관할로 합니다. 다만 판매자 또는 구매자의 거주국 강행법규가 적용되는 범위에서는 해당 법령이 우선할 수 있습니다.",
    },
    { type: "h3", text: "Article 14 (Contact)" },
    {
      type: "p",
      text: "For Seller Terms and service inquiries, contact MoCoMo LLC customer support or support@mocomo.net.",
    },
  ],
};

export type SellerConsentTableRow = {
  purpose: string;
  items: string;
  retention: string;
};

export const SELLER_MARKETING_CONSENT = {
  title: "Consent to collect and use personal information for marketing",
  intro:
    `MoCoMo LLC가 제공하는 "${MARKET_BRAND_FULL}"에서는 아래의 목적으로 개인정보를 수집 및 이용하며, 회원의 개인정보를 안전하게 취급하는데 최선을 다합니다.`,
  columns: {
    items: "Items collected (Collection item)",
    purpose: "Purpose of collection and use (Collection Purpose)",
    retention: "Retention period (Retention period)",
  },
  rows: [
    {
      items: "Email, mobile phone number, service usage records, voice data*",
      purpose:
        "Personalized ads, marketing, and promotions for our and partners' products based on inferred demographics, interests, and preferences; service quality improvement",
      retention: "Deleted when customized ads are blocked on opt-out; destroyed on account deletion",
    },
  ] satisfies SellerConsentTableRow[],
  footnotes: [
    "*Voice data may be collected when a call is required during service use.",
    "You may refuse consent; you can still use the service if you refuse.",
    "See the Seller Privacy Policy for more details.",
  ],
} as const;

export const SELLER_PRIVACY_GUIDE = {
  title: "Notice on collection and use of personal information",
  intro:
    `MoCoMo LLC가 제공하는 "${MARKET_BRAND_FULL}"에서는 아래의 목적으로 개인정보를 수집 및 이용하며, 회원의 개인정보를 안전하게 취급하는데 최선을 다합니다.`,
  columns: {
    purpose: "Purpose of collection and use (Collection Purpose)",
    items: "Items collected (Collection item)",
    retention: "Retention period (Retention period)",
  },
  rows: [
    {
      purpose:
        "Membership registration, user identification, member management (membership services, complaint handling, notices)",
      items: "Username, name, email, mobile phone number, password",
      retention: "Destroyed when the service agreement ends1)",
    },
    {
      purpose: "Fraud prevention",
      items: "Username, name, email, mobile phone number, and service usage records where fraud was detected",
      retention: "Retained for one year after the service agreement ends, then destroyed",
    },
  ] satisfies SellerConsentTableRow[],
  footnotes: [
    "1) If retention is required by law or Company policy, data is stored separately for the required period, then destroyed without delay.",
    "See the Seller Privacy Policy for more details.",
  ],
} as const;
