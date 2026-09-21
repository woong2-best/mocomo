import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { claimLetterDonationMoco } from "@/lib/gems/letter-donation";

/** POST /api/mobile/tips/[id]/open — receiver opens letter → receive MOCO */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-tip-letter-open", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await claimLetterDonationMoco({
    tipId: id,
    viewerId: auth.user.id,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    tip: result.tip,
    credited: result.credited,
    alreadyCredited: result.alreadyCredited,
    mocoCredited: "mocoCredited" in result ? result.mocoCredited : undefined,
  });
}
