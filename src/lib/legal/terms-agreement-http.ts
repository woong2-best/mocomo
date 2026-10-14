import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getLatestTermsVersion,
  recordTermsAgreement,
  resolveTermsGate,
  toPublicTermsVersion,
} from "@/lib/legal/terms-agreement";

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
    return NextResponse.json({
      required: false,
      signedIn: true,
      currentTermsVersion: gate.currentTermsVersion,
      terms: gate.required,
    });
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
  return NextResponse.json({
    ok: true,
    required: false,
    terms: agreed ?? toPublicTermsVersion(latest),
  });
}
