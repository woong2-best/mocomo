import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getLatestTermsVersion,
  recordTermsAgreement,
  resolveTermsGate,
  toPublicTermsVersion,
} from "@/lib/legal/terms-agreement";
import { sealTermsAck, TERMS_ACK_COOKIE, termsAckCookieOptions } from "@/lib/legal/terms-ack";

export async function termsStatusForUserId(userId: string | null) {
  if (!userId) {
    return NextResponse.json({ required: false, signedIn: false });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { currentTermsVersion: true },
  });
  return termsStatusJson(userId, user?.currentTermsVersion);
}

export async function termsStatusJson(userId: string | null, currentTermsVersion?: string | null) {
  if (!userId) {
    return NextResponse.json({ required: false, signedIn: false });
  }

  const gate = await resolveTermsGate(currentTermsVersion);
  if (!gate.termsRequired || !gate.required) {
    const res = NextResponse.json({
      required: false,
      signedIn: true,
      currentTermsVersion: gate.currentTermsVersion,
      terms: gate.required,
    });
    if (gate.required?.versionTag) {
      const sealed = await sealTermsAck(gate.required.versionTag);
      if (sealed) res.cookies.set(TERMS_ACK_COOKIE, sealed, termsAckCookieOptions());
    }
    return res;
  }

  return NextResponse.json({
    required: true,
    signedIn: true,
    currentTermsVersion: gate.currentTermsVersion,
    terms: gate.required,
  });
}

export async function termsAgreeJson(userId: string, userIp: string | null) {
  const latest = await getLatestTermsVersion();
  if (!latest) {
    return NextResponse.json({ ok: true, required: false });
  }

  const agreed = await recordTermsAgreement({ userId, userIp });
  const terms = agreed ?? toPublicTermsVersion(latest);
  const res = NextResponse.json({
    ok: true,
    required: false,
    terms,
  });
  const sealed = await sealTermsAck(terms.versionTag);
  if (sealed) {
    res.cookies.set(TERMS_ACK_COOKIE, sealed, termsAckCookieOptions());
  }
  return res;
}
