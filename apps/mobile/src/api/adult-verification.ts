import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { AdultVerificationScope } from "@/lib/adult-verification-messages";

export type AdultVerificationStatus = {
  isAdult: boolean;
  adultVerifiedAt: string | null;
};

export async function fetchAdultVerificationStatus() {
  return apiRequest<AdultVerificationStatus>(MobileApi.adultVerificationStatus, {
    auth: true,
  });
}

export async function confirmAdultVerification(input: {
  identityVerificationId: string;
  scope?: AdultVerificationScope;
}) {
  return apiRequest<{ success: true; isAdult: boolean; alreadyVerified?: boolean }>(
    MobileApi.adultVerificationConfirm,
    {
      method: "POST",
      auth: true,
      body: input,
    }
  );
}
