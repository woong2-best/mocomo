import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  createWtbAlert,
  listMyWtbAlerts,
} from "@/lib/subculture-commerce/wtb-alerts";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-subculture-wtb-list", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const rows = await listMyWtbAlerts(auth.user.id);
  return NextResponse.json({
    items: rows.map((a) => ({
      id: a.id,
      workTitle: a.workTitle,
      animeSlug: a.animeSlug,
      productType: a.productType,
      characterName: a.characterName,
      maxPrice: a.maxPrice,
      currency: a.currency,
      note: a.note,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

const createSchema = z.object({
  workTitle: z.string().max(120).optional(),
  animeSlug: z.string().max(120).optional(),
  productType: z.string().max(40).optional(),
  characterName: z.string().max(80).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  currency: z.enum(["krw", "usd"]).optional(),
  note: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-subculture-wtb-create", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const result = await createWtbAlert(auth.user.id, parsed.data);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ alertId: result.alertId });
}
