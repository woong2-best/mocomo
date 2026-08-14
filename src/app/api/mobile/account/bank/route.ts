import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getRequestIp } from "@/lib/request-ip";
import {
  getAccountBankStatusForUser,
  loadBankVerificationUserById,
  sendAccountBankVerificationForUser,
  verifyAccountBankCodeForUser,
} from "@/lib/used-market-bank-verification";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-account-bank-status", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const status = await getAccountBankStatusForUser(auth.user.id);
  if (!status) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(status);
}

const bodySchema = z.discriminatedUnion("action", [
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

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-account-bank", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const user = await loadBankVerificationUserById(auth.user.id);
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const ip = await getRequestIp();

  if (parsed.data.action === "send") {
    const result = await sendAccountBankVerificationForUser(
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

  const result = await verifyAccountBankCodeForUser(
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
