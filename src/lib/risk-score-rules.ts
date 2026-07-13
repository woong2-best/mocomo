export const RISK_SCORE_RULES = {
  PROFANITY: 10,
  HATE_SPEECH: 40,
  THREAT: 60,
  SELF_HARM_ENCOURAGEMENT: 70,
  PHISHING_LINK: 80,
  MALWARE_LINK: 100,
  SPAM_POST: 20,
  DUPLICATE_POST: 15,
  DUPLICATE_COMMENT: 15,
  AD_SPAM: 20,
  IMPERSONATION: 60,
  ILLEGAL_TRADE: 80,
  SEXUAL_CONTENT: 50,
  CHILD_SAFETY: 200,
  REPORT_RECEIVED: 3,
  REPORT_APPROVED: 20,
  PRIOR_SANCTION: 15,
  VPN_ABUSE: 10,
  MASS_ACCOUNT_CREATION: 30,
  DM_SPAM: 40,
  LIVE_SPAM: 30,
} as const;

export type RiskScoreReason = keyof typeof RISK_SCORE_RULES;

export type RiskTier =
  | "normal"
  | "caution"
  | "limited"
  | "review"
  | "pending_sanction"
  | "urgent";

export function riskTierFromScore(score: number): RiskTier {
  if (score >= 200) return "urgent";
  if (score >= 180) return "pending_sanction";
  if (score >= 120) return "review";
  if (score >= 80) return "limited";
  if (score >= 40) return "caution";
  return "normal";
}

export function riskTierLabel(tier: RiskTier): string {
  switch (tier) {
    case "normal":
      return "정상";
    case "caution":
      return "주의";
    case "limited":
      return "일부 제한";
    case "review":
      return "관리자 검토";
    case "pending_sanction":
      return "제재 대기";
    case "urgent":
      return "긴급 검토";
  }
}

export function riskDecayForDays(cleanDays: number): number {
  if (cleanDays >= 90) return 30;
  if (cleanDays >= 60) return 20;
  if (cleanDays >= 30) return 10;
  return 0;
}

export function mapAiCategoriesToRisk(categories: Record<string, boolean>): {
  delta: number;
  reason: RiskScoreReason;
}[] {
  const out: { delta: number; reason: RiskScoreReason }[] = [];
  if (categories.hate) out.push({ delta: RISK_SCORE_RULES.HATE_SPEECH, reason: "HATE_SPEECH" });
  if (categories["harassment/threatening"] || categories.threat) {
    out.push({ delta: RISK_SCORE_RULES.THREAT, reason: "THREAT" });
  }
  if (categories["self-harm"] || categories["self-harm/intent"]) {
    out.push({ delta: RISK_SCORE_RULES.SELF_HARM_ENCOURAGEMENT, reason: "SELF_HARM_ENCOURAGEMENT" });
  }
  if (categories.harassment) out.push({ delta: RISK_SCORE_RULES.PROFANITY, reason: "PROFANITY" });
  if (categories.sexual) out.push({ delta: RISK_SCORE_RULES.SEXUAL_CONTENT, reason: "SEXUAL_CONTENT" });
  if (categories["sexual/minors"]) out.push({ delta: RISK_SCORE_RULES.CHILD_SAFETY, reason: "CHILD_SAFETY" });
  if (categories.violence) out.push({ delta: RISK_SCORE_RULES.THREAT, reason: "THREAT" });
  return out;
}
