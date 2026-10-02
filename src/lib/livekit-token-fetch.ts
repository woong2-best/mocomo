export type LivekitCredentials = {
  token: string;
  serverUrl: string;
  hostUserId?: string;
  role?: string;
};

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
    hostUserId?: string;
    role?: string;
    reason?: string;
  } = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    const msg = body.error ?? `Something went wrong. Please try again.${res.status})`;
    const retry5xx = res.status >= 500 && attempt < 2;
    if (retry5xx) {
      await new Promise((r) => setTimeout(r, 500));
      return fetchLivekitCredentials(roomName, attempt + 1);
    }
    throw new Error(msg);
  }

  if (!body.token || !body.serverUrl) {
    throw new Error(body.error ?? "Invalid LiveKit response.");
  }

  return {
    token: body.token,
    serverUrl: body.serverUrl,
    hostUserId: body.hostUserId,
    role: body.role,
  };
}
