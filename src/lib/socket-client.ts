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
