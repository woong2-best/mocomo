/** ROSCA / FTC — creator recurring donation disclosure (v1) */
export const RECURRING_DONATION_TERMS_VERSION = "2026-09-v1";

/** Short notice above pay button (KR) */
export const RECURRING_DONATION_CHECKOUT_NOTICE_KO =
  "Monthly recurring support. Completed tips aren't refunded; cancel future charges anytime in [My page].";

/** Checkbox label (KR) — must be explicitly opted in (default unchecked) */
export const RECURRING_DONATION_CHECKBOX_LABEL_KO =
  "I understand completed tips aren't refunded and I can cancel next month's charge anytime.";

/** Terms of Service clause (EN) — required in legal/terms */
export const RECURRING_DONATION_TOS_CLAUSE_EN =
  "All recurring donations are non-refundable once processed. You may cancel your subscription at any time to prevent future charges.";

export const RECURRING_DONATION_TOS_CLAUSE_KO =
  "Recurring support (subscription) tips generally aren't refunded; cancel anytime to stop future billing.";

export const RECURRING_DONATION_TERMS_REQUIRED_ERROR =
  "Please agree to the recurring support terms.";

export function buildRecurringDonationTermsSnapshot(): string {
  return [
    RECURRING_DONATION_CHECKOUT_NOTICE_KO,
    RECURRING_DONATION_CHECKBOX_LABEL_KO,
    RECURRING_DONATION_TOS_CLAUSE_EN,
  ].join("\n");
}
