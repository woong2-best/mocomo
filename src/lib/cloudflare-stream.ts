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

/** API 응답에서 추출 (Vercel에 CUSTOMER_HOST 없어도 동작) */
let discoveredCustomerHost: string | null = null;

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

function rememberCustomerHostFromMediaUrl(url: string | undefined): void {
  if (discoveredCustomerHost || !url?.trim()) return;
  try {
    const host = new URL(url.trim()).host;
    if (host.startsWith("customer-") && host.endsWith(".cloudflarestream.com")) {
      discoveredCustomerHost = host;
    }
  } catch {
    /* ignore */
  }
}

function rememberCustomerHostFromApi(row: {
  webRTC?: { url?: string };
  webRTCPlayback?: { url?: string };
  playback?: { hls?: string; dash?: string };
  thumbnail?: string;
  preview?: string;
}): void {
  rememberCustomerHostFromMediaUrl(row.webRTC?.url);
  if (discoveredCustomerHost) return;
  rememberCustomerHostFromMediaUrl(row.webRTCPlayback?.url);
  if (discoveredCustomerHost) return;
  rememberCustomerHostFromMediaUrl(row.playback?.hls);
  rememberCustomerHostFromMediaUrl(row.playback?.dash);
  rememberCustomerHostFromMediaUrl(row.thumbnail);
  rememberCustomerHostFromMediaUrl(row.preview);
}

type LiveInputsListResult = {
  liveInputs?: Array<{ uid?: string }>;
};

/** customer-xxxxx.cloudflarestream.com (https 없이) */
export function getStreamCustomerHost(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_HOST?.trim() ||
    process.env.CLOUDFLARE_STREAM_CUSTOMER_HOST?.trim() ||
    null;
  if (raw) return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return discoveredCustomerHost;
}

export function isCloudflareStreamConfigured(): boolean {
  return !!(accountId() && apiToken());
}

export function cloudflareStreamConfigError(): string | null {
  if (!accountId()) return "CLOUDFLARE_ACCOUNT_ID가 설정되지 않았습니다.";
  if (!apiToken()) return "CLOUDFLARE_STREAM_API_TOKEN이 설정되지 않았습니다.";
  return null;
}

async function listLiveInputUids(): Promise<string[]> {
  const list = await streamApi<LiveInputsListResult | ApiLiveInput[]>(
    "/stream/live_inputs",
    { method: "GET" }
  );
  if (Array.isArray(list)) {
    return list.map((r) => r.uid?.trim()).filter(Boolean) as string[];
  }
  return (list?.liveInputs ?? []).map((r) => r.uid?.trim()).filter(Boolean) as string[];
}

async function discoverCustomerHostFromVideos(): Promise<void> {
  if (discoveredCustomerHost) return;
  try {
    const videos = await streamApi<
      Array<{
        playback?: { hls?: string; dash?: string };
        thumbnail?: string;
        preview?: string;
      }>
    >("/stream?limit=10", { method: "GET" });
    for (const row of Array.isArray(videos) ? videos : []) {
      rememberCustomerHostFromApi(row);
      if (discoveredCustomerHost) return;
    }
  } catch (e) {
    console.warn("[cloudflare-stream] list videos", e);
  }
}

/** Live Input이 하나도 없을 때 customer host 확보용 (녹화 off) */
async function bootstrapCustomerHostViaLiveInput(): Promise<void> {
  if (discoveredCustomerHost) return;
  try {
    const result = await streamApi<ApiLiveInput>("/stream/live_inputs", {
      method: "POST",
      body: JSON.stringify({
        meta: { name: "mocomo-host-bootstrap", system: "mocomo" },
        recording: { mode: "off" },
      }),
    });
    rememberCustomerHostFromApi(result);
  } catch (e) {
    console.warn("[cloudflare-stream] bootstrap live input", e);
  }
}

export async function ensureStreamCustomerHost(): Promise<string | null> {
  const existing = getStreamCustomerHost();
  if (existing) return existing;

  if (!accountId() || !apiToken()) return null;

  try {
    const uids = await listLiveInputUids();
    for (const uid of uids.slice(0, 8)) {
      const detail = await streamApi<ApiLiveInput>(`/stream/live_inputs/${uid}`, {
        method: "GET",
      });
      rememberCustomerHostFromApi(detail);
      if (discoveredCustomerHost) return discoveredCustomerHost;
    }
  } catch (e) {
    console.warn("[cloudflare-stream] discover from live_inputs", e);
  }

  await discoverCustomerHostFromVideos();
  if (!discoveredCustomerHost) {
    await bootstrapCustomerHostViaLiveInput();
  }

  return discoveredCustomerHost;
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

export async function buildLiveInputHlsUrlAsync(liveInputUid: string): Promise<string | null> {
  await ensureStreamCustomerHost();
  return buildLiveInputHlsUrl(liveInputUid);
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
    const msg = json.errors?.[0]?.message || `Cloudflare API ${res.status}`;
    throw new Error(msg);
  }

  return json.result as T;
}

type ApiLiveInput = {
  uid?: string;
  enabled?: boolean;
  rtmps?: { url?: string; streamKey?: string };
  meta?: Record<string, unknown>;
  webRTC?: { url?: string };
  webRTCPlayback?: { url?: string };
};

function normalizeLiveInput(row: ApiLiveInput): CloudflareLiveInput | null {
  const uid = row.uid?.trim();
  const url = row.rtmps?.url?.trim();
  const streamKey = row.rtmps?.streamKey?.trim();
  if (!uid || !url || !streamKey) return null;
  rememberCustomerHostFromApi(row);
  return {
    uid,
    rtmpsUrl: url,
    rtmpsStreamKey: streamKey,
    enabled: row.enabled !== false,
  };
}

/** 방송마다 Live Input — 녹화 off (저장 비용 없음) */
export async function createCloudflareLiveInput(options: {
  name: string;
  channelId: string;
}): Promise<CloudflareLiveInput> {
  await ensureStreamCustomerHost();

  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://mocomo.net";

  const result = await streamApi<ApiLiveInput>("/stream/live_inputs", {
    method: "POST",
    body: JSON.stringify({
      meta: { name: options.name, channelId: options.channelId },
      recording: { mode: "off", hideLiveViewerCount: false },
      preferLowLatency: true,
    }),
  });

  const input = normalizeLiveInput(result);
  if (!input) throw new Error("Live Input RTMPS credentials missing");

  try {
    await streamApi<unknown>(`/stream/live_inputs/${input.uid}`, {
      method: "PUT",
      body: JSON.stringify({
        recording: {
          mode: "off",
          allowedOrigins: [
            appOrigin.replace(/\/$/, ""),
            "https://mocomo.net",
            "http://localhost:3000",
          ],
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

/** 브라우저 WHIP 송출 URL (OBS 없이 웹캠·화면공유) */
export async function getCloudflareWhipPublishUrl(
  liveInputUid: string
): Promise<string | null> {
  try {
    const result = await streamApi<ApiLiveInput>(`/stream/live_inputs/${liveInputUid}`, {
      method: "GET",
    });
    rememberCustomerHostFromApi(result);
    const url = result.webRTC?.url?.trim();
    return url || null;
  } catch (e) {
    console.warn("[cloudflare-stream] whip url", liveInputUid, e);
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
  await ensureStreamCustomerHost();
  const host = getStreamCustomerHost();
  const hlsUrl = buildLiveInputHlsUrl(liveInputUid);
  if (!host) {
    return {
      onAir: false,
      playable: false,
      hlsUrl: null,
      videoUid: null,
      error: "customer host unknown — 키 다시 받기 후 재시도",
    };
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
