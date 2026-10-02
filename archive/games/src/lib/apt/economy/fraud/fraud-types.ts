export type FraudRuleCode =
  | "SELF_MARKET"
  | "MULTI_ACCOUNT"
  | "GOLD_SPIKE"
  | "PRICE_MANIPULATION"
  | "LIVE_FARM"
  | "OFFLINE_SPAM"
  | "IMPOSSIBLE_PLAY"
  | "MARKET_LOOP"
  | "RAPID_LOGIN"
  | "IAP_REPLAY"
  | "TOKEN_REUSE"
  | "CHARGEBACK"
  | "REFUND_ABUSE";

export type FraudStatus = "NORMAL" | "WATCH" | "SUSPICIOUS" | "HIGH_RISK";

export type FraudRuleHit = {
  rule: FraudRuleCode;
  score: number;
  evidence: Record<string, unknown>;
};

export const FRAUD_STATUS_LABEL: Record<FraudStatus, string> = {
  NORMAL: "Normal",
  WATCH: "Watch",
  SUSPICIOUS: "Suspicious",
  HIGH_RISK: "High Risk",
};

export function scoreToStatus(score: number): FraudStatus {
  if (score >= 80) return "HIGH_RISK";
  if (score >= 60) return "SUSPICIOUS";
  if (score >= 30) return "WATCH";
  return "NORMAL";
}

export const DEFAULT_FRAUD_RULES: {
  id: FraudRuleCode;
  label: string;
  weight: number;
  description: string;
}[] = [
  { id: "SELF_MARKET", label: "자기 거래", weight: 35, description: "동일 상대와 매수·매도 반복" },
  { id: "MULTI_ACCOUNT", label: "다계정", weight: 40, description: "동일 기기/IP 다계정" },
  { id: "GOLD_SPIKE", label: "골드 급증", weight: 45, description: "일일 골드 수입 이상치" },
  { id: "PRICE_MANIPULATION", label: "가격 조작", weight: 55, description: "비정상 가격 펌핑/덤핑" },
  { id: "LIVE_FARM", label: "라이브 파밍", weight: 30, description: "라이브 골드 과다 수령" },
  { id: "OFFLINE_SPAM", label: "오프라인 남용", weight: 20, description: "과다 offline ops" },
  { id: "IMPOSSIBLE_PLAY", label: "불가능 속도", weight: 60, description: "단시간 대량 거래" },
  { id: "MARKET_LOOP", label: "장터 루프", weight: 50, description: "순환 거래 패턴" },
  { id: "RAPID_LOGIN", label: "급속 활동", weight: 25, description: "짧은 시간 다수 활동" },
  { id: "IAP_REPLAY", label: "IAP Replay", weight: 70, description: "동일 orderId 재생" },
  { id: "TOKEN_REUSE", label: "Token Reuse", weight: 85, description: "purchaseToken 재사용" },
  { id: "CHARGEBACK", label: "Chargeback", weight: 75, description: "결제 취소·차지백" },
  { id: "REFUND_ABUSE", label: "Refund Abuse", weight: 65, description: "환불 후 자산 부족" },
];
