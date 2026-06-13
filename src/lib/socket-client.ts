/** 클라이언트 Socket.IO — 서버 발급 토큰으로만 연결 */

export async function fetchSocketAuthToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/socket-auth", { credentials: "include" });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}

/** 방 입장 전 빠른 진단 — 60초 대기 없이 원인 표시 */
export async function diagnoseSocketAuth(): Promise<string | null> {
  if (typeof window !== "undefined") {
    const url = (await import("@/lib/socket-url")).resolveSocketUrl();
    if (!url) return "실시간 서버 URL이 설정되지 않았습니다. (NEXT_PUBLIC_SOCKET_URL)";
  }
  try {
    const res = await fetch("/api/socket-auth", { credentials: "include" });
    if (res.status === 401) return "로그인이 필요합니다. 다시 로그인해 주세요.";
    if (!res.ok) return "인증 토큰 발급 실패. Vercel AUTH_SECRET 설정 후 재배포해 주세요.";
    const data = (await res.json()) as { token?: string };
    if (!data.token) return "인증 토큰을 받지 못했습니다. Vercel AUTH_SECRET을 확인해 주세요.";
    return null;
  } catch {
    return "인증 서버에 연결할 수 없습니다.";
  }
}
