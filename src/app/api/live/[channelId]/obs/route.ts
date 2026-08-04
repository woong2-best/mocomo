import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { obsConfigError, provisionObsIngress } from "@/lib/obs-ingress-service";
import { rejectIfFirstPartyLiveDisabled } from "@/lib/live-first-party-guard";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const blocked = rejectIfFirstPartyLiveDisabled();
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  if (!channelId || channelId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const configErr = obsConfigError();
  if (configErr) {
    return NextResponse.json({ error: configErr, configured: false }, { status: 503 });
  }

  const result = await provisionObsIngress(channelId, session.user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    url: result.data.url,
    streamKey: result.data.streamKey,
    obsServer: result.data.obsServer,
    obsStreamKey: result.data.obsStreamKey,
    ingressId: result.data.ingressId,
    ingestEngine: result.data.ingestEngine,
    warning: result.warning ?? null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const blocked = rejectIfFirstPartyLiveDisabled();
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  if (!channelId || channelId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let refresh = false;
  try {
    const body = await req.json();
    refresh = !!body?.refresh;
  } catch {
    /* empty body ok */
  }

  const result = await provisionObsIngress(channelId, session.user.id, { force: refresh });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    url: result.data.url,
    streamKey: result.data.streamKey,
    obsServer: result.data.obsServer,
    obsStreamKey: result.data.obsStreamKey,
    ingressId: result.data.ingressId,
    ingestEngine: result.data.ingestEngine,
    warning: result.warning ?? null,
  });
}
