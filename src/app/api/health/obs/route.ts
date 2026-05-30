import { NextResponse } from "next/server";
import {
  cloudflareStreamConfigError,
  ensureStreamCustomerHost,
  getStreamCustomerHost,
  isCloudflareStreamConfigured,
} from "@/lib/cloudflare-stream";
import { preferredLiveIngestEngine } from "@/lib/live-ingest";
import { isLivekitIngressConfigured } from "@/lib/livekit-ingress";
import { getSrsRtmpUrl, getSrsHlsBaseUrl, isSrsConfigured } from "@/lib/srs";

/** 방송 송출 엔진 상태 */
export async function GET() {
  const engine = preferredLiveIngestEngine();

  if (engine === "cloudflare") {
    const err = cloudflareStreamConfigError();
    const host = err ? null : await ensureStreamCustomerHost();
    return NextResponse.json({
      engine: "cloudflare",
      configured: !err && !!host,
      error: err || (!host ? "Stream customer host를 API에서 찾지 못했습니다. API 토큰·Stream 구독 확인." : null),
      hint: "OBS → Cloudflare Stream Live (RTMPS). 스튜디오 서버/키 사용. Vultr·LiveKit 방송 불필요.",
      streamHost: host ?? getStreamCustomerHost(),
      recording: "off",
    });
  }

  if (engine === "livekit") {
    return NextResponse.json({
      engine: "livekit",
      configured: isLivekitIngressConfigured(),
      error: null,
      hint: "OBS → LiveKit Cloud RTMP. (권장: Cloudflare Stream으로 전환)",
      livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? null,
    });
  }

  const configured = isSrsConfigured();

  return NextResponse.json({
    engine: "srs",
    configured,
    usingFallback: configured && !process.env.SRS_RTMP_URL?.trim(),
    rtmpUrl: configured ? getSrsRtmpUrl() : null,
    hlsBase: configured ? getSrsHlsBaseUrl() : null,
    hint: "OBS → Vultr VPS. 권장: Cloudflare Stream (LIVE_INGEST_ENGINE=cloudflare).",
  });
}
