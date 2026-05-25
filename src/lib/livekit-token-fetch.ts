export type LivekitCredentials = { token: string; serverUrl: string };

export async function fetchLivekitCredentials(
  roomName: string,
  attempt = 0
): Promise<LivekitCredentials> {
  const res = await fetch(`/api/livekit/token?room=${encodeURIComponent(roomName)}`, {
    credentials: "include",
    cache: "no-store",
  });

  let body: {
    error?: string;
    token?: string;
    serverUrl?: string;
    reason?: string;
  } = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    const msg = body.error ?? `연결 실패 (${res.status})`;
    const retry403 =
      res.status === 403 && body.reason === "CALL_NOT_ACTIVE" && attempt < 5;
    const retry5xx = res.status >= 500 && attempt < 2;
    if (retry403 || retry5xx) {
      await new Promise((r) => setTimeout(r, retry403 ? 400 : 1200));
      return fetchLivekitCredentials(roomName, attempt + 1);
    }
    throw new Error(msg);
  }

  if (!body.token || !body.serverUrl) {
    throw new Error(body.error ?? "LiveKit 응답이 올바르지 않습니다.");
  }

  return { token: body.token, serverUrl: body.serverUrl };
}
