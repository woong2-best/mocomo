import { headers } from "next/headers";
import type { TermsConsentAction } from "@prisma/client";
import { db } from "@/lib/db";
import { getRequestIp } from "@/lib/request-ip";

export async function recordTermsConsent(input: {
  userId: string;
  termsVersion: string;
  actionType: TermsConsentAction;
  acknowledgementText: string;
}): Promise<void> {
  let userAgent: string | null = null;
  try {
    const h = await headers();
    userAgent = h.get("user-agent")?.slice(0, 500) ?? null;
  } catch {
    userAgent = null;
  }
  const ip = await getRequestIp().catch(() => "");
  await db.termsConsentLog.create({
    data: {
      userId: input.userId,
      termsVersion: input.termsVersion,
      actionType: input.actionType,
      acknowledgementText: input.acknowledgementText,
      ipAddress: ip || null,
      userAgent,
    },
  });
}
