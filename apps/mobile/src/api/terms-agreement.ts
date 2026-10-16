import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import { API_BASE_URL } from "@/config/env";

export const TERMS_REQUIRED_CODE = "TERMS_REQUIRED";

export type TermsAgreementInfo = {
  versionTag: string;
  effectiveDate: string;
  termsUrl: string;
};

type TermsStatusResponse = {
  required?: boolean;
  terms?: TermsAgreementInfo | null;
};

export function resolveTermsReviewUrl(termsUrl: string): string {
  const trimmed = termsUrl.trim();
  if (!trimmed) return `${API_BASE_URL}/legal/terms#changed-part`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${path}`;
}

export function parseTermsPayload(body: unknown): TermsAgreementInfo | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as {
    code?: unknown;
    versionTag?: unknown;
    effectiveDate?: unknown;
    termsUrl?: unknown;
    terms?: unknown;
  };
  const source =
    rec.terms && typeof rec.terms === "object"
      ? (rec.terms as Record<string, unknown>)
      : rec;
  const versionTag = typeof source.versionTag === "string" ? source.versionTag : "";
  const effectiveDate =
    typeof source.effectiveDate === "string" ? source.effectiveDate : "";
  const termsUrl =
    typeof source.termsUrl === "string" && source.termsUrl.trim()
      ? source.termsUrl
      : "/legal/terms#changed-part";
  if (!versionTag && !effectiveDate && rec.code !== TERMS_REQUIRED_CODE) return null;
  return {
    versionTag: versionTag || "v2.0",
    effectiveDate: effectiveDate || "2026-11-15",
    termsUrl: resolveTermsReviewUrl(termsUrl),
  };
}

export async function fetchTermsAgreementStatus(): Promise<TermsAgreementInfo | null> {
  const data = await apiRequest<TermsStatusResponse>(MobileApi.termsStatus, { auth: true });
  if (!data.required || !data.terms) return null;
  return parseTermsPayload(data);
}

export async function acceptLatestTerms(): Promise<TermsAgreementInfo | null> {
  const data = await apiRequest<unknown>(MobileApi.termsAgree, {
    method: "POST",
    auth: true,
    body: {},
  });
  return parseTermsPayload(data);
}
