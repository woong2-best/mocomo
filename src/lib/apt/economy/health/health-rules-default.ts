import type { HealthAutoAction, HealthSeverity } from "./health-types";

export type DefaultHealthRule = {
  code: string;
  domain: string;
  label: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: HealthSeverity;
  autoAction: HealthAutoAction;
  sortOrder: number;
};

export const DEFAULT_HEALTH_RULES: DefaultHealthRule[] = [
  {
    code: "wallet_error",
    domain: "wallet",
    label: "Wallet Error",
    metric: "walletErrors",
    operator: "gt",
    threshold: 0,
    severity: "CRITICAL",
    autoAction: "EMERGENCY",
    sortOrder: 1,
  },
  {
    code: "market_error_rate",
    domain: "market",
    label: "Market Error Rate",
    metric: "marketErrorRate",
    operator: "gt",
    threshold: 0.02,
    severity: "WARN",
    autoAction: "STOP_CANARY",
    sortOrder: 2,
  },
  {
    code: "gold_inflation",
    domain: "wallet",
    label: "Gold Inflation",
    metric: "netInflation",
    operator: "gt",
    threshold: 0.1,
    severity: "WARN",
    autoAction: "NOTIFY",
    sortOrder: 3,
  },
  {
    code: "duplicate_purchase",
    domain: "market",
    label: "Duplicate Purchase",
    metric: "duplicatePurchase",
    operator: "gt",
    threshold: 0,
    severity: "CRITICAL",
    autoAction: "EMERGENCY",
    sortOrder: 4,
  },
  {
    code: "fraud_increase",
    domain: "fraud",
    label: "Fraud Increase",
    metric: "fraudIncrease",
    operator: "gt",
    threshold: 0.8,
    severity: "WARN",
    autoAction: "MARKET_OFF",
    sortOrder: 5,
  },
  {
    code: "negative_balance",
    domain: "wallet",
    label: "Negative Balance",
    metric: "negativeBalance",
    operator: "gt",
    threshold: 0,
    severity: "CRITICAL",
    autoAction: "ROLLBACK",
    sortOrder: 6,
  },
  {
    code: "notification_failure",
    domain: "notification",
    label: "Notification Failure",
    metric: "failures",
    operator: "gt",
    threshold: 5,
    severity: "WARN",
    autoAction: "NOTIFY",
    sortOrder: 7,
  },
  {
    code: "iap_verify_fail",
    domain: "iap",
    label: "IAP Verify Fail",
    metric: "verifyFail",
    operator: "gt",
    threshold: 0,
    severity: "CRITICAL",
    autoAction: "NOTIFY",
    sortOrder: 8,
  },
  {
    code: "iap_ack_fail",
    domain: "iap",
    label: "IAP Ack Fail",
    metric: "ackFail",
    operator: "gt",
    threshold: 0,
    severity: "WARN",
    autoAction: "NOTIFY",
    sortOrder: 9,
  },
];
