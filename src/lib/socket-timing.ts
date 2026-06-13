/** Render free tier cold start — Socket.IO 연결·대기 한도 */
export const SOCKET_CONNECT_TIMEOUT_MS = 60_000;
export const SOCKET_WAIT_MS = 60_000;
export const SOCKET_ACK_MS = 15_000;
export const SOCKET_IO_TIMEOUT_MS = 25_000;

export function socketHealthUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/health`;
}

/** 브라우저에서 Render 인스턴스를 깨운 뒤 Socket.IO 핸드셰이크 */
export async function wakeSocketServer(baseUrl: string): Promise<boolean> {
  const url = socketHealthUrl(baseUrl);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SOCKET_CONNECT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

/** 서버(API route)에서 소켓 헬스 확인 */
export async function pingSocketServer(
  baseUrl: string,
  timeoutMs = 45_000
): Promise<{ ok: boolean; ms: number }> {
  const url = socketHealthUrl(baseUrl);
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    return { ok: res.ok, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  } finally {
    clearTimeout(timer);
  }
}
