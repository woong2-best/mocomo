import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";

const settingsSchema = z.object({
  enabled: z.boolean(),
  rateKrwPerHour: z.number().int().min(5_000).max(500_000).nullable(),
});

/** GET/PUT /api/mobile/me/creator-call-settings */
export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const user = await db.user.findUnique({
    where: { id: auth.user.id },
    select: {
      creatorCallEnabled: true,
      creatorCallRateKrwPerHour: true,
      cosplayerProfile: { select: { id: true } },
      streamerProfile: { select: { id: true } },
    },
  });

  const isCreator = !!(user?.cosplayerProfile || user?.streamerProfile);
  return NextResponse.json({
    isCreator,
    enabled: user?.creatorCallEnabled ?? false,
    rateKrwPerHour: user?.creatorCallRateKrwPerHour ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `creator-call-settings:${auth.user.id}`, 20);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: auth.user.id },
    select: {
      cosplayerProfile: { select: { id: true } },
      streamerProfile: { select: { id: true } },
    },
  });

  const isCreator = !!(user?.cosplayerProfile || user?.streamerProfile);
  if (!isCreator) {
    return NextResponse.json(
      { error: "크리에이터(코스플레이/스트리머) 프로필이 있어야 통화 예약을 받을 수 있습니다." },
      { status: 422 }
    );
  }

  if (parsed.data.enabled && !parsed.data.rateKrwPerHour) {
    return NextResponse.json({ error: "시간당 요금을 설정해 주세요." }, { status: 422 });
  }

  const updated = await db.user.update({
    where: { id: auth.user.id },
    data: {
      creatorCallEnabled: parsed.data.enabled,
      creatorCallRateKrwPerHour: parsed.data.enabled ? parsed.data.rateKrwPerHour : null,
    },
    select: {
      creatorCallEnabled: true,
      creatorCallRateKrwPerHour: true,
    },
  });

  return NextResponse.json({
    isCreator: true,
    enabled: updated.creatorCallEnabled,
    rateKrwPerHour: updated.creatorCallRateKrwPerHour,
  });
}
