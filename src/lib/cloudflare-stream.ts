/** Cloudflare Stream Live — OBS RTMPS → 글로벌 HLS (VPS/LiveKit 방송 대체) */

const API_BASE = "https://api.cloudflare.com/client/v4";

export type CloudflareLiveInput = {
  uid: string;
  rtmpsUrl: string;
  rtmpsStreamKey: string;
  enabled: boolean;
};

export type CloudflareLiveProbe = {
  onAir: boolean;
  playable: boolean;
  hlsUrl: string | null;
  videoUid: string | null;
  error?: string;
};

function accountId(): string | null {
  return process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || null;
}

function apiToken(): string | null {
  return (
    process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim() ||
    process.env.CLOUDFLARE_API_TOKEN?.trim() ||
    null
  );
}

/** customer-xxxxx.cloudflarestream.com (https 없이) */
export function getStreamCustomerHost(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_HOST?.trim() ||
    process.env.CLOUDFLARE_STREAM_CUSTOMER_HOST?.trim() ||
    null;
  if (!raw) return null;
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function isCloudflareStreamConfigured(): boolean {
  return !!(accountId() && apiToken() && getStreamCustomerHost());
}

export function cloudflareStreamConfigError(): string | null {
  if (!accountId()) return "CLOUDFLARE_ACCOUNT_ID가 설정되지 않았습니다.";
  if (!apiToken()) return "CLOUDFLARE_STREAM_API_TOKEN이 설정되지 않았습니다.";
  if (!getStreamCustomerHost()) {
    return "NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_HOST가 필요합니다. (Stream 대시보드의 customer-xxx.cloudflarestream.com)";
  }
  return null;
}

export function liveInputUidFromIngressId(ingressId: string | null | undefined): string | null {
  const id = ingressId?.trim() ?? "";
  if (!id.startsWith("cf:")) return null;
  return id.slice(3) || null;
}

export function buildLiveInputHlsUrl(liveInputUid: string): string | null {
  const host = getStreamCustomerHost();
  if (!host || !liveInputUid.trim()) return null;
  return `https://${host}/${liveInputUid.trim()}/manifest/video.m3u8`;
}

export function buildLiveInputIframeUrl(liveInputUid: string): string | null {
  const host = getStreamCustomerHost();
  if (!host || !liveInputUid.trim()) return null;
  return `https://${host}/${liveInputUid.trim()}/iframe`;
}

async function streamApi<T>(path: string, init?: RequestInit): Promise<T> {
  const acc = accountId();
  const token = apiToken();
  if (!acc || !token) throw new Error("Cloudflare Stream not configured");

  const res = await fetch(`${API_BASE}/accounts/${acc}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: T;
  };

  if (!res.ok || !json.success) {
    const msg =
      json.errors?.[0]?.message || `Cloudflare API ${res.status}`;
    throw new Error(msg);
  }

  return json.result as T;
}

type ApiLiveInput = {
  uid?: string;
  enabled?: boolean;
  rtmps?: { url?: string; streamKey?: string };
  meta?: Record<string, unknown>;
};

function normalizeLiveInput(row: ApiLiveInput): CloudflareLiveInput | null {
  const uid = row.uid?.trim();
  const url = row.rtmps?.url?.trim();
  const streamKey = row.rtmps?.streamKey?.trim();
  if (!uid || !url || !streamKey) return null;
  return {
    uid,
    rtmpsUrl: url,
    rtmpsStreamKey: streamKey,
    enabled: row.enabled !== false,
  };
}

/** 방송마다 Live Input (채널 uid = meta) */
export async function createCloudflareLiveInput(options: {
  name: string;
  channelId: string;
}): Promise<CloudflareLiveInput> {
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://mocomo.net";

  const result = await streamApi<ApiLiveInput>("/stream/live_inputs", {
    method: "POST",
    body: JSON.stringify({
      meta: { name: options.name, channelId: options.channelId },
      recording: { mode: "automatic", hideLiveViewerCount: false },
      preferLowLatency: true,
      deleteRecordingAfterDays: 1,
    }),
  });

  const input = normalizeLiveInput(result);
  if (!input) throw new Error("Live Input RTMPS credentials missing");

  try {
    await streamApi<unknown>(`/stream/live_inputs/${input.uid}`, {
      method: "PUT",
      body: JSON.stringify({
        recording: {
          mode: "automatic",
          allowedOrigins: [appOrigin.replace(/\/$/, ""), "https://mocomo.net", "http://localhost:3000"],
        },
      }),
    });
  } catch (e) {
    console.warn("[cloudflare-stream] allowedOrigins update", e);
  }

  return input;
}

export async function getCloudflareLiveInput(liveInputUid: string): Promise<CloudflareLiveInput | null> {
  try {
    const result = await streamApi<ApiLiveInput>(`/stream/live_inputs/${liveInputUid}`, {
      method: "GET",
    });
    return normalizeLiveInput(result);
  } catch {
    return null;
  }
}

export async function deleteCloudflareLiveInput(liveInputUid: string): Promise<void> {
  try {
    await streamApi<unknown>(`/stream/live_inputs/${liveInputUid}`, { method: "DELETE" });
  } catch (e) {
    console.warn("[cloudflare-stream] delete", liveInputUid, e);
  }
}

/** 공개 lifecycle — 송출 여부 */
export async function probeCloudflareLiveInput(liveInputUid: string): Promise<CloudflareLiveProbe> {
  const host = getStreamCustomerHost();
  const hlsUrl = buildLiveInputHlsUrl(liveInputUid);
  if (!host) {
    return { onAir: false, playable: false, hlsUrl: null, videoUid: null, error: "not configured" };
  }

  try {
    const res = await fetch(`https://${host}/${liveInputUid}/lifecycle`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return {
        onAir: false,
        playable: false,
        hlsUrl,
        videoUid: null,
        error: `lifecycle ${res.status}`,
      };
    }
    const json = (await res.json()) as {
      live?: boolean;
      videoUID?: string | null;
    };
    const onAir = !!json.live;
    return {
      onAir,
      playable: onAir,
      hlsUrl: onAir ? hlsUrl : null,
      videoUid: json.videoUID ?? null,
    };
  } catch (e) {
    return {
      onAir: false,
      playable: false,
      hlsUrl,
      videoUid: null,
      error: e instanceof Error ? e.message : "lifecycle failed",
    };
  }
}
