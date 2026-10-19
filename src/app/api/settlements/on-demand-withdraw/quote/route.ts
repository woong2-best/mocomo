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
    return NextResponse.json({ error: quote.message, code: quote.code }, { status: 400 });
  }

  return NextResponse.json(serializeOnDemandQuote(quote));
}
