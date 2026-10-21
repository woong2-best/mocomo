import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getOnDemandWithdrawalQuoteForUser } from "@/lib/settlement-moco/on-demand-withdrawal";
import { serializeOnDemandQuote } from "@/lib/settlement-moco/quote-payload";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "settlement-on-demand-quote", 30);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const quote = await getOnDemandWithdrawalQuoteForUser(session.user.id);
  if (!quote.ok) {
    return NextResponse.json({
      ok: false,
      code: quote.code,
      message: quote.message,
    });
  }

  return NextResponse.json({ ok: true, ...serializeOnDemandQuote(quote) });
}
