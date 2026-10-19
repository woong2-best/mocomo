import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getOnDemandWithdrawalQuoteForUser } from "@/lib/settlement-moco/on-demand-withdrawal";
import { serializeOnDemandQuote } from "@/lib/settlement-moco/quote-payload";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-settlement-on-demand-quote", 30);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const quote = await getOnDemandWithdrawalQuoteForUser(authResult.user.id);
  if (!quote.ok) {
    return NextResponse.json({ error: quote.message, code: quote.code }, { status: 400 });
  }

  return NextResponse.json(serializeOnDemandQuote(quote));
}
