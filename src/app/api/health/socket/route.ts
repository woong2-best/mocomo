import { NextResponse } from "next/server";
import { pingSocketServer } from "@/lib/socket-timing";

export const dynamic = "force-dynamic";

/** Vercel·Render 소켓 설정·연결 상태 (비밀값 노출 없음) */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  const authSecretConfigured = Boolean(process.env.AUTH_SECRET?.trim());

  if (!url || url.includes("localhost")) {
    return NextResponse.json({
      configured: false,
      authSecretConfigured,
      reachable: false,
      ms: 0,
      hint: "Vercel에 NEXT_PUBLIC_SOCKET_URL=https://mocomo-socket.onrender.com 설정 후 재배포",
    });
  }

  if (!authSecretConfigured) {
    return NextResponse.json({
      configured: true,
      authSecretConfigured: false,
      url,
      reachable: false,
      ms: 0,
      hint: "Vercel에 AUTH_SECRET이 없습니다. Render와 동일한 값을 넣고 재배포하세요.",
    });
  }

  const { ok, ms } = await pingSocketServer(url);
  return NextResponse.json({
    configured: true,
    authSecretConfigured: true,
    url,
    reachable: ok,
    ms,
    hint: ok
      ? "소켓 서버는 응답 중입니다. 브라우저 연결 실패 시 Render AUTH_SECRET이 Vercel과 같은지 확인하세요."
      : "Render mocomo-socket이 sleep 상태입니다. Manual Deploy 후 1분 정도 기다려 주세요.",
  });
}
