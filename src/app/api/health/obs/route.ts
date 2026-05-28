import { NextResponse } from "next/server";
import { obsConfigError } from "@/lib/obs-ingress-service";
import { getSrsRtmpUrl, getSrsHlsBaseUrl, isSrsConfigured } from "@/lib/srs";

/** SRS RTMP → HLS 방송 연동 준비 상태 */
export async function GET() {
  const configErr = obsConfigError();
  return NextResponse.json({
    engine: "srs",
    configured: isSrsConfigured() && !configErr,
    error: configErr,
    rtmpUrl: process.env.SRS_RTMP_URL ? getSrsRtmpUrl() : null,
    hlsBase: process.env.NEXT_PUBLIC_SRS_HLS_BASE_URL ? getSrsHlsBaseUrl() : null,
    hint: configErr
      ? "Vercel에 SRS_RTMP_URL, NEXT_PUBLIC_SRS_HLS_BASE_URL을 설정하고 Ubuntu VPS에 SRS를 띄우세요. scripts/SRS_STREAMING_SETUP.md 참고."
      : "OBS 탭에서 RTMP 서버·방송 키를 복사해 OBS에 붙여넣으면 HLS로 시청됩니다.",
  });
}
