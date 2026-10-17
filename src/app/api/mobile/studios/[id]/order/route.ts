import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { placeStudioOrder } from "@/lib/creator-studio";

const bodySchema = z.object({
  tierId: z.string().min(1).max(40),
  addonIds: z.array(z.string().max(40)).max(12).optional(),
  answers: z.record(z.string().max(2000)),
  agreed: z.literal(true),
});

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const limited = await rateLimitPublicApi(req, "mobile-studio-order", 15);
  if (limited) return limited;
  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Fill the request form and agree to the rules." }, { status: 400 });
  const result = await placeStudioOrder(auth.user.id, id, {
    tierId: parsed.data.tierId,
    addonIds: parsed.data.addonIds ?? [],
    answers: parsed.data.answers,
    agreed: true,
  });
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
