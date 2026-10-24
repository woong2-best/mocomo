import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { resolveLiveAvatarId } from "@/lib/ai-live/avatars";
import { getIdolBackdropUrl } from "@/lib/ai-live/idol-backdrop";
import { IDOL_BACKDROP_DEFAULTS, backdropSlotForAvatar } from "@/lib/ai-live/idol-backdrop-shared";
import { getIdolVrmUrl } from "@/lib/ai-live/idol-vrm";
import { IDOL_VRM_DEFAULTS } from "@/lib/ai-live/idol-vrm-shared";

export const dynamic = "force-dynamic";

/** Public stage files — the same VRM and backdrop the website room loads. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-ai-stage", 60);
  if (limited) return limited;

  const avatar = resolveLiveAvatarId(req.nextUrl.searchParams.get("character")) ?? "zelie";
  const backdropSlot = backdropSlotForAvatar(avatar) ?? "moco";
  const [vrmUrl, backdropUrl] = await Promise.all([
    getIdolVrmUrl(avatar).catch(() => IDOL_VRM_DEFAULTS[avatar]),
    getIdolBackdropUrl(avatar).catch(() => IDOL_BACKDROP_DEFAULTS[backdropSlot]),
  ]);

  return NextResponse.json({
    characterId: avatar,
    vrmUrl,
    backdropUrl: backdropUrl ?? IDOL_BACKDROP_DEFAULTS[backdropSlot],
  });
}
