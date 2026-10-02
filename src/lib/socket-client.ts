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
    if (!url) return "Realtime server URL is not configured. (NEXT_PUBLIC_SOCKET_URL)";
  }
  try {
    const res = await fetch("/api/socket-auth", { credentials: "include" });
    if (res.status === 401) return "Sign-in required. Please sign in again.";
    if (!res.ok) return "Failed to issue auth token. Set AUTH_SECRET on Vercel and redeploy.";
    const data = (await res.json()) as { token?: string };
    if (!data.token) return "Could not receive auth token. Check AUTH_SECRET on Vercel.";
    return null;
  } catch {
    return "Could not connect to the auth server.";
  }
}
