import { NextResponse } from "next/server";
import { obsConfigError } from "@/lib/obs-ingress-service";
import { getSrsRtmpUrl, getSrsHlsBaseUrl, isSrsConfigured } from "@/lib/srs";

/** SRS RTMP → HLS 방송 연동 준비 상태 */
export async function GET() {
  const configErr = obsConfigError();
  const hasRtmp = !!process.env.SRS_RTMP_URL?.trim();
  const hasHls = !!(
    process.env.NEXT_PUBLIC_SRS_HLS_BASE_URL?.trim() || process.env.SRS_HLS_BASE_URL?.trim()
  );
  const missingEnv: string[] = [];
  if (!hasRtmp) missingEnv.push("SRS_RTMP_URL");
  if (!hasHls) missingEnv.push("NEXT_PUBLIC_SRS_HLS_BASE_URL");

  const configured = isSrsConfigured() && !configErr;

  return NextResponse.json({
    engine: "srs",
    configured,
    error: configErr,
    missingEnv,
    hasRtmp: hasRtmp || configured,
    hasHls: hasHls || configured,
    usingFallback: configured && !hasRtmp,
    rtmpUrl: configured ? getSrsRtmpUrl() : null,
    hlsBase: configured ? getSrsHlsBaseUrl() : null,
    hint: configErr
      ? `Vercel Production에 ${missingEnv.join(", ")} 추가 후 Redeploy 하세요.`
      : "OBS 탭에서 RTMP 서버·방송 키를 복사해 OBS에 붙여넣으면 HLS로 시청됩니다.",
  });
}
