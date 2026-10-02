import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getOnDemandWithdrawalQuoteForUser } from "@/lib/settlement-moco/on-demand-withdrawal";
import { serializeOnDemandQuote } from "@/lib/settlement-moco/quote-payload";

const bodySchema = z.object({
  withdrawMoco: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-settlement-on-demand-quote", 30);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the MOCO amount to withdraw." }, { status: 400 });
  }

  const quote = await getOnDemandWithdrawalQuoteForUser(
    authResult.user.id,
    parsed.data.withdrawMoco,
  );
  if (!quote.ok) {
    return NextResponse.json({ error: quote.message, code: quote.code }, { status: 400 });
  }

  return NextResponse.json(serializeOnDemandQuote(quote));
}
