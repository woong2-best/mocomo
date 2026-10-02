/** Off-platform payment & external contact patterns masked in site messages (DM, group, community). */

export const DM_CONTENT_MASK = "###";

export const DM_CONTENT_FILTER_ERROR = "chat.error.offPlatformSolicitation";

export const DM_CONTENT_FILTER_WARNING_EN =
  "Off-platform payments and external contact solicitation are prohibited. Masked content was replaced with ###.";

type MaskRule = {
  id: string;
  pattern: RegExp;
};

/** Longer / more specific patterns first to avoid partial overlaps. */
const MASK_RULES: MaskRule[] = [
  { id: "stripe_url", pattern: /:\/\/stripe\.com/gi },
  { id: "stripe", pattern: /stripe\.com/gi },
  { id: "telegram_kr_long", pattern: /\uD154\uB808\uADF8\uB7A8/gi },
  { id: "telegram", pattern: /telegram/gi },
  { id: "paypal", pattern: /paypal/gi },
  { id: "payple_kr", pattern: /\uD398\uC774\uD314/gi },
  { id: "account_kr", pattern: /\uACC4\uC870/gi },
  { id: "deposit_kr", pattern: /\uC785\uAE08/gi },
  { id: "tele_kr", pattern: /\uD154\uB808/gi },
  { id: "tele_en", pattern: /\btele\b/gi },
  { id: "kakao", pattern: /\uCE74\uD1A1/gi },
  { id: "line_en", pattern: /\bline\b/gi },
  { id: "line_kr", pattern: /\uB77C\uC778/gi },
];

export type FilterDmMessageResult = {
  text: string;
  wasFiltered: boolean;
  matchedRuleIds: string[];
};

function maskWithRule(text: string, pattern: RegExp): string {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return text.replace(new RegExp(pattern.source, flags), DM_CONTENT_MASK);
}

export function filterDmMessageContent(content: string): FilterDmMessageResult {
  let text = content;
  const matchedRuleIds: string[] = [];

  for (const rule of MASK_RULES) {
    const probe = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`);
    if (probe.test(text)) {
      matchedRuleIds.push(rule.id);
      text = maskWithRule(text, rule.pattern);
    }
  }

  return {
    text,
    wasFiltered: matchedRuleIds.length > 0,
    matchedRuleIds,
  };
}

/** Marketing DM settings — reject prohibited terms instead of masking at save/send time. */
export function validateCreatorMarketingText(
  content: string | null | undefined
): { ok: true; text: string } | { ok: false; error: string } {
  const trimmed = (content ?? "").trim();
  if (!trimmed) return { ok: true, text: "" };
  const filtered = filterDmMessageContent(trimmed);
  if (filtered.wasFiltered) {
    return { ok: false, error: DM_CONTENT_FILTER_ERROR };
  }
  return { ok: true, text: filtered.text };
}
