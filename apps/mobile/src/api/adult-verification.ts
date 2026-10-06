import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type AdultVerificationStatus = {
  isAdult: boolean;
  adultVerifiedAt: string | null;
  hasBirthDate: boolean;
  canAccessPaidAdult: boolean;
  moneyAge?: {
    allowed: boolean;
    reason: "missing" | "underage" | null;
    hasBirthDate: boolean;
    minAge: number;
  };
};

export async function fetchAdultVerificationStatus() {
  return apiRequest<AdultVerificationStatus>(MobileApi.adultVerificationStatus, {
    auth: true,
  });
}
