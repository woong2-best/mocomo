import { NextResponse } from "next/server";
import { preferredLiveIngestEngine } from "@/lib/live-ingest";
import { isLivekitIngressConfigured } from "@/lib/livekit-ingress";
import { getSrsRtmpUrl, getSrsHlsBaseUrl, isSrsConfigured } from "@/lib/srs";

/** 방송 송출 엔진 상태 */
export async function GET() {
  const engine = preferredLiveIngestEngine();

  if (engine === "livekit") {
    return NextResponse.json({
      engine: "livekit",
      configured: isLivekitIngressConfigured(),
      error: null,
      hint: "OBS → LiveKit Cloud RTMP. 스튜디오에서 발급된 서버/키 사용. VPS(45.32.16.32) 불필요.",
      livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? null,
    });
  }

  const hasRtmp = !!process.env.SRS_RTMP_URL?.trim();
  const hasHls = !!(
    process.env.NEXT_PUBLIC_SRS_HLS_BASE_URL?.trim() || process.env.SRS_HLS_BASE_URL?.trim()
  );
  const configured = isSrsConfigured();

  return NextResponse.json({
    engine: "srs",
    configured,
    usingFallback: configured && !hasRtmp,
    rtmpUrl: configured ? getSrsRtmpUrl() : null,
    hlsBase: configured ? getSrsHlsBaseUrl() : null,
    hint: "OBS → Vultr VPS(SRS). 권장은 LiveKit(LIVE_INGEST_ENGINE=livekit).",
  });
}
