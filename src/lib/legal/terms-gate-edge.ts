import { NextResponse } from "next/server";
import {
  TERMS_REQUIRED_CODE,
  TERMS_REQUIRED_ERROR,
  type TermsRequiredPayload,
} from "@/lib/legal/terms-gate-shared";

export {
  TERMS_REQUIRED_CODE,
  TERMS_REQUIRED_ERROR,
  isTermsGateExemptApiPath,
  isTermsGateExemptPagePath,
} from "@/lib/legal/terms-gate-shared";
export type { TermsRequiredPayload } from "@/lib/legal/terms-gate-shared";

export function termsRequiredJsonResponse(input?: {
  versionTag?: string | null;
  effectiveDate?: string | null;
  termsUrl?: string | null;
}): NextResponse {
  const body: TermsRequiredPayload = {
    error: TERMS_REQUIRED_ERROR,
    code: TERMS_REQUIRED_CODE,
    versionTag: input?.versionTag ?? null,
    effectiveDate: input?.effectiveDate ?? null,
    termsUrl: input?.termsUrl ?? null,
  };
  return NextResponse.json(body, { status: 403 });
}
