import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  cloudflareStreamConfigError,
  getCloudflareWhipPublishUrl,
  liveInputUidFromIngressId,
} from "@/lib/cloudflare-stream";
import { resolveWhipPublishUrlForHost } from "@/lib/cloudflare-whip-resolve";
import { readPublisherTabIdFromRequest } from "@/lib/live-publisher-lock";
import { provisionObsIngress } from "@/lib/obs-ingress-service";
import { rejectIfFirstPartyLiveDisabled } from "@/lib/live-first-party-guard";
import { normalizeSdp } from "@/lib/webrtc-sdp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function whipErrorMessage(status: number, raw: string): string {
  const text = raw.trim();
  if (status === 401 && /stream key/i.test(text)) {
    return "송출 키가 만료되었거나 잘못되었습니다. 페이지를 새로고침한 뒤 방송을 다시 시작해 주세요.";
  }
  if (/Unable to parse SDP/i.test(text)) {
    return "영상 연결 정보(SDP) 형식 오류입니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.";
  }
  return text || `WHIP 연결 실패 (${status})`;
}

async function postSdpToCloudflareWhip(whipUrl: string, sdp: string) {
  return fetch(whipUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/sdp",
      Accept: "application/sdp",
    },
    body: sdp,
  });
}

/** WHIP SDP — 브라우저 CORS 우회, Cloudflare로 프록시 (WHEP와 동일) */
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

  const cfErr = cloudflareStreamConfigError();
  if (cfErr) {
    return NextResponse.json({ error: cfErr }, { status: 503 });
  }

  const { channelId } = await params;
  if (!channelId || channelId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { sdp?: string };
  const sdp = body.sdp ? normalizeSdp(body.sdp) : "";
  if (!sdp) {
    return NextResponse.json({ error: "SDP가 필요합니다." }, { status: 400 });
  }

  const tabId = readPublisherTabIdFromRequest(req);
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      createdBy: true,
      rtmpIngressId: true,
      rtmpUrl: true,
      broadcastMode: true,
      isLive: true,
      liveStatus: true,
      livePublisherTabId: true,
    },
  });

  if (!channel) {
    return NextResponse.json({ error: "방송을 찾을 수 없습니다." }, { status: 404 });
  }

  const resolved = await resolveWhipPublishUrlForHost(channel, session.user.id, tabId);
  if ("error" in resolved) {
    return NextResponse.json(
      {
        error: resolved.error,
        publishState: resolved.publishState,
      },
      { status: resolved.status }
    );
  }

  try {
    let whipUrl = resolved.whipUrl;
    let cfRes = await postSdpToCloudflareWhip(whipUrl, sdp);
    let text = await cfRes.text();

    if (cfRes.status === 401 && /stream key/i.test(text)) {
      const prov = await provisionObsIngress(channelId, session.user.id, { force: true });
      if ("data" in prov) {
        const cfUid = liveInputUidFromIngressId(prov.data.ingressId);
        const freshUrl = cfUid ? await getCloudflareWhipPublishUrl(cfUid) : null;
        if (freshUrl) {
          whipUrl = freshUrl;
          cfRes = await postSdpToCloudflareWhip(whipUrl, sdp);
          text = await cfRes.text();
        }
      }
    }

    if (!cfRes.ok) {
      return NextResponse.json(
        { error: whipErrorMessage(cfRes.status, text) },
        { status: cfRes.status >= 400 && cfRes.status < 600 ? cfRes.status : 502 }
      );
    }

    return NextResponse.json({
      answerSdp: normalizeSdp(text),
      location: cfRes.headers.get("location"),
      etag: cfRes.headers.get("etag"),
    });
  } catch (e) {
    console.error("[whip-proxy]", channelId, e);
    return NextResponse.json(
      { error: "Cloudflare 송출 서버 연결에 실패했습니다." },
      { status: 502 }
    );
  }
}
