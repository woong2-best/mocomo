import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  acceptDirectMeet,
  adjustDirectMeet,
  getDirectTradeView,
  listDirectTradesForUser,
  proposeDirectMeet,
  reportDirectNoShow,
  submitDirectTradePin,
  verifyDirectArrival,
} from "@/lib/direct-trade/service";

const bodySchema = z.object({
  listingId: z.string().min(1).max(64),
  action: z.enum(["proposeMeet", "acceptMeet", "adjustMeet", "verifyArrival", "reportNoShow", "submitPin"]),
  meetAt: z.string().max(40).optional(),
  direction: z.enum(["earlier", "later"]).optional(),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
  accuracyMeters: z.number().finite().nullable().optional(),
  failure: z.enum(["PERMISSION_DENIED", "GPS_FAILED"]).optional(),
  pin: z.string().max(8).optional(),
});

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-direct-trade", 60);
  if (limited) return limited;
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const listingId = req.nextUrl.searchParams.get("listingId");
  const roomId = req.nextUrl.searchParams.get("roomId");
  if (listingId || roomId) {
    const view = await getDirectTradeView(auth.user.id, {
      listingId: listingId ?? undefined,
      roomId: roomId ?? undefined,
    });
    if (!view) return NextResponse.json({ error: "거래를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ view });
  }
  const trades = await listDirectTradesForUser(auth.user.id);
  return NextResponse.json({ trades });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-direct-trade-write", 30);
  if (limited) return limited;
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const body = parsed.data;
  const userId = auth.user.id;

  const result = await (async () => {
    switch (body.action) {
      case "proposeMeet":
        return proposeDirectMeet(userId, body.listingId, body.meetAt ?? "");
      case "acceptMeet":
        return acceptDirectMeet(userId, body.listingId);
      case "adjustMeet":
        return adjustDirectMeet(userId, body.listingId, body.direction ?? "later");
      case "verifyArrival":
        return verifyDirectArrival(userId, body.listingId, {
          latitude: body.latitude,
          longitude: body.longitude,
          accuracyMeters: body.accuracyMeters,
          failure: body.failure,
        });
      case "reportNoShow":
        return reportDirectNoShow(userId, body.listingId);
      case "submitPin":
        return submitDirectTradePin(userId, body.listingId, body.pin ?? "");
      default:
        return null;
    }
  })();

  if (!result) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  if (result.error && !result.view.listingId) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }
  return NextResponse.json(result);
}
