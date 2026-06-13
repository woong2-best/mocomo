import { NextResponse } from "next/server";
import { pingSocketServer } from "@/lib/socket-timing";

export const dynamic = "force-dynamic";

/** Vercel·Render 소켓 설정·연결 상태 (비밀값 노출 없음) */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!url || url.includes("localhost")) {
    return NextResponse.json({
      configured: false,
      reachable: false,
      ms: 0,
      hint: "Vercel에 NEXT_PUBLIC_SOCKET_URL=https://mocomo-socket.onrender.com 설정 후 재배포",
    });
  }

  const { ok, ms } = await pingSocketServer(url);
  return NextResponse.json({
    configured: true,
    url,
    reachable: ok,
    ms,
    hint: ok
      ? null
      : "Render mocomo-socket이 sleep 상태이거나 AUTH_SECRET·CORS를 확인한 뒤 Manual Deploy",
  });
}
