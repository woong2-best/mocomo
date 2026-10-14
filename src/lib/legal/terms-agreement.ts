import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TERMS_CHANGED_PART_ID, TERMS_OF_SERVICE_PATH } from "@/lib/legal/terms-versions";
import {
  TERMS_REQUIRED_CODE,
  TERMS_REQUIRED_ERROR,
} from "@/lib/legal/terms-gate-shared";
import { termsRequiredJsonResponse } from "@/lib/legal/terms-gate-edge";

export { TERMS_REQUIRED_CODE, TERMS_REQUIRED_ERROR, termsRequiredJsonResponse };
export type { TermsRequiredPayload } from "@/lib/legal/terms-gate-edge";

export type TermsVersionRow = {
  id: string;
  versionTag: string;
  effectiveDate: Date;
  termsUrl: string;
};

export type PublicTermsVersion = {
  versionTag: string;
  effectiveDate: string;
  termsUrl: string;
};

const LATEST_TTL_MS = 30_000;
let latestCache: { at: number; value: TermsVersionRow | null } | null = null;

export function invalidateLatestTermsCache() {
  latestCache = null;
}

type DbLike = Prisma.TransactionClient | typeof db;

export class TermsRequiredError extends Error {
  readonly code = TERMS_REQUIRED_CODE;
  constructor(readonly terms: PublicTermsVersion) {
    super(TERMS_REQUIRED_CODE);
    this.name = "TermsRequiredError";
  }
}

export function formatTermsEffectiveDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function termsReviewHref(termsUrl: string): string {
  const trimmed = termsUrl.trim() || TERMS_OF_SERVICE_PATH;
  if (trimmed.includes("#")) return trimmed;
  return `${trimmed}#${TERMS_CHANGED_PART_ID}`;
}

export function toPublicTermsVersion(row: TermsVersionRow): PublicTermsVersion {
  return {
    versionTag: row.versionTag,
    effectiveDate: formatTermsEffectiveDate(row.effectiveDate),
    termsUrl: termsReviewHref(row.termsUrl),
  };
}

export function userMatchesTermsVersion(
  currentTermsVersion: string | null | undefined,
  requiredTag: string
): boolean {
  return (currentTermsVersion ?? "").trim() === requiredTag;
}

/** Latest published Terms of Service version (source of truth). */
export async function getLatestTermsVersion(
  client: DbLike = db
): Promise<TermsVersionRow | null> {
  const useCache = client === db;
  if (useCache && latestCache && Date.now() - latestCache.at < LATEST_TTL_MS) {
    return latestCache.value;
  }

  const row = await client.termsVersion.findFirst({
    orderBy: [{ effectiveDate: "desc" }, { versionTag: "desc" }],
    select: {
      id: true,
      versionTag: true,
      effectiveDate: true,
      termsUrl: true,
    },
  });

  if (useCache) {
    latestCache = { at: Date.now(), value: row };
  }
  return row;
}

export async function resolveTermsGate(
  currentTermsVersion: string | null | undefined
): Promise<{
  termsRequired: boolean;
  currentTermsVersion: string | null;
  required: PublicTermsVersion | null;
}> {
  const current = currentTermsVersion?.trim() || null;
  try {
    const latest = await getLatestTermsVersion();
    if (!latest) {
      return { termsRequired: false, currentTermsVersion: current, required: null };
    }
    const required = toPublicTermsVersion(latest);
    return {
      termsRequired: !userMatchesTermsVersion(current, latest.versionTag),
      currentTermsVersion: current,
      required,
    };
  } catch {
    return { termsRequired: false, currentTermsVersion: current, required: null };
  }
}

export async function assertLatestTermsAccepted(
  currentTermsVersion: string | null | undefined
): Promise<void> {
  const gate = await resolveTermsGate(currentTermsVersion);
  if (gate.termsRequired && gate.required) {
    throw new TermsRequiredError(gate.required);
  }
}

export function termsRequiredApiResponse(required: PublicTermsVersion): NextResponse {
  return termsRequiredJsonResponse({
    versionTag: required.versionTag,
    effectiveDate: required.effectiveDate,
    termsUrl: required.termsUrl,
  });
}

export async function termsGateApiResponse(
  currentTermsVersion: string | null | undefined
): Promise<NextResponse | null> {
  const gate = await resolveTermsGate(currentTermsVersion);
  if (!gate.termsRequired || !gate.required) return null;
  return termsRequiredApiResponse(gate.required);
}

export async function applyLatestTermsOnSignup(
  client: DbLike,
  userId: string,
  userIp: string | null
): Promise<void> {
  const latest = await getLatestTermsVersion(client);
  if (!latest) return;

  await client.user.update({
    where: { id: userId },
    data: { currentTermsVersion: latest.versionTag },
  });
  await client.termsAgreementHistory.create({
    data: {
      userId,
      termsVersion: latest.versionTag,
      userIp: userIp?.slice(0, 128) || null,
    },
  });
}

export async function applyTermsGateToJwtToken(
  token: {
    currentTermsVersion?: string | null;
    termsRequired?: boolean;
    requiredTermsVersion?: string | null;
    requiredTermsEffectiveDate?: string | null;
    requiredTermsUrl?: string | null;
  },
  currentTermsVersion?: string | null
): Promise<void> {
  const gate = await resolveTermsGate(
    currentTermsVersion !== undefined ? currentTermsVersion : token.currentTermsVersion
  );
  token.currentTermsVersion = gate.currentTermsVersion;
  token.termsRequired = gate.termsRequired;
  token.requiredTermsVersion = gate.required?.versionTag ?? null;
  token.requiredTermsEffectiveDate = gate.required?.effectiveDate ?? null;
  token.requiredTermsUrl = gate.required?.termsUrl ?? null;
}

export async function recordTermsAgreement(input: {
  userId: string;
  userIp: string | null;
}): Promise<PublicTermsVersion | null> {
  const latest = await getLatestTermsVersion();
  if (!latest) return null;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { currentTermsVersion: latest.versionTag },
    });
    await tx.termsAgreementHistory.create({
      data: {
        userId: input.userId,
        termsVersion: latest.versionTag,
        userIp: input.userIp?.slice(0, 128) || null,
      },
    });
  });

  latestCache = { at: Date.now(), value: latest };
  return toPublicTermsVersion(latest);
}
