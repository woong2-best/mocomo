/** Off-platform payment & external contact patterns masked in site messages (DM, group, community). */

export const DM_CONTENT_MASK = "###";

export const DM_CONTENT_FILTER_WARNING_KO =
  "외부 결제·연락처 유도는 이용약관상 금지됩니다. 해당 내용이 자동으로 가려졌습니다.";

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
  { id: "telegram_kr_long", pattern: /텔레그렘/gi },
  { id: "telegram", pattern: /telegram/gi },
  { id: "paypal", pattern: /paypal/gi },
  { id: "payple_kr", pattern: /페이팔/gi },
  { id: "account_kr", pattern: /계좌/gi },
  { id: "deposit_kr", pattern: /입금/gi },
  { id: "tele_kr", pattern: /텔레/gi },
  { id: "tele_en", pattern: /\btele\b/gi },
  { id: "kakao", pattern: /카톡/gi },
  { id: "line_en", pattern: /\bline\b/gi },
  { id: "line_kr", pattern: /라인/gi },
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
