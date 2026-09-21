import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type SettlementStatus = {
  registered: boolean;
  payoutsEnabled: boolean;
  hasConnectAccount?: boolean;
  needsExpressMigration?: boolean;
  taxReportingReady?: boolean;
  taxRequirementsDue?: boolean;
  connectAccountType?: string | null;
  settlementMocoPoints: number;
  earnedMocoPoints: number;
  earnedMocoTier: string;
  purchasedMocoPoints: number;
  profile: {
    countryCode: string;
    legalName: string;
    accountNumberLast4: string;
    accountHolderName: string;
    bankCode: string | null;
    taxFormType: string;
    registeredAt: string | null;
  } | null;
};

/** @deprecated Custom Connect 제거 — startExpressConnectOnboarding 사용 */
export type RegisterSettlementPayload = {
  countryCode: string;
  legalName: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  addressLine1: string;
  city: string;
  state?: string;
  postalCode: string;
  accountNumber: string;
  accountHolderName: string;
  bankCode?: string;
  routingNumber?: string;
  taxAttestationAccepted: true;
  ssn?: string;
  requestCardPayments?: boolean;
};

export async function fetchSettlementStatus() {
  return apiRequest<SettlementStatus>(MobileApi.settlementStatus, { auth: true });
}

/**
 * @deprecated Custom Connect 410 — use POST /api/mobile/settlements/connect-account
 */
export async function registerSettlement(payload: RegisterSettlementPayload) {
  return apiRequest<{ success: true; payoutsEnabled: boolean } | { error: string }>(
    MobileApi.settlementRegister,
    { method: "POST", body: payload, auth: true }
  );
}
