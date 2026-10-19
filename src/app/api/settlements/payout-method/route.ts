import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { isOAuthEncryptionConfigured } from "@/lib/encryption";
import { db } from "@/lib/db";
import { parsePayoutDestination, sealPayoutDestination } from "@/lib/creator-payout/destination";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "creator-payout-method", 10);
  if (limited) return limited;

  let userId: string;
  try {
    userId = (await requireAuth()).id;
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    }
    return NextResponse.json({ error: "This account cannot save a payout destination." }, { status: 403 });
  }

  if (!isOAuthEncryptionConfigured()) {
    return NextResponse.json({ error: "Payout storage is not configured." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const destination = parsePayoutDestination(body);
  if (!destination) {
    return NextResponse.json(
      { error: "Enter a valid Payoneer email, Wise email, or bank account." },
      { status: 400 },
    );
  }

  let sealed: ReturnType<typeof sealPayoutDestination>;
  try {
    sealed = sealPayoutDestination(destination);
  } catch {
    return NextResponse.json({ error: "Payout storage is not configured." }, { status: 503 });
  }

  await db.payoutMethod.upsert({
    where: { userId },
    create: { userId, kind: destination.kind, ...sealed },
    update: { kind: destination.kind, ...sealed },
  });

  return NextResponse.json({ ok: true, kind: destination.kind, hint: sealed.destinationHint });
}
