import { NextResponse } from "next/server";
import { obsConfigError } from "@/lib/obs-ingress-service";
import { isLivekitIngressConfigured } from "@/lib/livekit-ingress";

/** OBS(RTMP) 연동 준비 상태 — 설정만 점검 (키 발급은 하지 않음) */
export async function GET() {
  const configErr = obsConfigError();
  return NextResponse.json({
    configured: !configErr,
    ingressApi: isLivekitIngressConfigured(),
    error: configErr,
    hint: configErr
      ? "Vercel LIVEKIT_* 환경 변수와 Supabase U) OBS SQL을 확인하세요."
      : "MoCoMo 방송 스튜디오 OBS 탭에서 서버·스트림 키가 자동 발급됩니다.",
  });
}
