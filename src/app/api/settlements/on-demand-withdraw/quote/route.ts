import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getOnDemandWithdrawalQuoteForUser } from "@/lib/settlement-moco/on-demand-withdrawal";
import { serializeOnDemandQuote } from "@/lib/settlement-moco/quote-payload";

const bodySchema = z.object({
  withdrawMoco: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "settlement-on-demand-quote", 30);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "출금 MOCO 수량을 확인해 주세요." }, { status: 400 });
  }

  const quote = await getOnDemandWithdrawalQuoteForUser(session.user.id, parsed.data.withdrawMoco);
  if (!quote.ok) {
    return NextResponse.json({ error: quote.message, code: quote.code }, { status: 400 });
  }

  return NextResponse.json(serializeOnDemandQuote(quote));
}
