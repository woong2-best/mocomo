import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getRequestIp } from "@/lib/request-ip";
import {
  getUsedMarketBankStatusForUser,
  loadBankVerificationUserById,
  sendUsedMarketBankVerificationForUser,
  verifyUsedMarketBankCodeForUser,
} from "@/lib/used-market-bank-verification";
import {
  getUsedMarketPhoneStatusForUser,
  sendUsedMarketPhoneOtpForUser,
  verifyUsedMarketPhoneOtpForUser,
} from "@/lib/used-market-phone-otp";
import { isKoreaUsedMarketCountry } from "@/lib/used-regions-global";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-used-bank-status", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const user = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { countryCode: true },
  });
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  if (isKoreaUsedMarketCountry(user.countryCode)) {
    const status = await getUsedMarketBankStatusForUser(auth.user.id);
    if (!status) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json(status);
  }

  const phone = await getUsedMarketPhoneStatusForUser(auth.user.id);
  if (!phone) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({
    countryCode: phone.countryCode,
    phone: phone.phone,
    phoneVerified: phone.phoneVerified,
    displayPhone: phone.displayPhone,
    eligible: phone.eligible,
    usedMarketEligible: phone.eligible,
  });
}

const bankBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    bankCode: z.string().min(2).max(8),
    accountNum: z.string().min(8).max(20),
  }),
  z.object({
    action: z.literal("verify"),
    bankCode: z.string().min(2).max(8),
    accountNum: z.string().min(8).max(20),
    code: z.string().min(4).max(8),
  }),
]);

const phoneBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    phone: z.string().min(6).max(24),
  }),
  z.object({
    action: z.literal("verify"),
    phone: z.string().min(6).max(24),
    code: z.string().min(4).max(8),
  }),
]);

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-used-bank-otp", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const userRow = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, countryCode: true, phone: true, phoneVerified: true },
  });
  if (!userRow) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const ip = await getRequestIp();

  if (isKoreaUsedMarketCountry(userRow.countryCode)) {
    const parsed = bankBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
    }

    const user = await loadBankVerificationUserById(auth.user.id);
    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    if (parsed.data.action === "send") {
      const result = await sendUsedMarketBankVerificationForUser(
        user,
        parsed.data.bankCode,
        parsed.data.accountNum,
        { ip, linkStripeConnect: false }
      );
      if ("error" in result && result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    const result = await verifyUsedMarketBankCodeForUser(
      user,
      parsed.data.bankCode,
      parsed.data.accountNum,
      parsed.data.code,
      { ip, linkStripeConnect: false }
    );
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  const parsed = phoneBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  if (parsed.data.action === "send") {
    const result = await sendUsedMarketPhoneOtpForUser(userRow, parsed.data.phone);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  const result = await verifyUsedMarketPhoneOtpForUser(
    userRow,
    parsed.data.phone,
    parsed.data.code
  );
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
