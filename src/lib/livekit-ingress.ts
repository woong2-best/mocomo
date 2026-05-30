import { IngressClient, IngressInput, type IngressInfo } from "livekit-server-sdk";
import { getLivekitApiHost } from "@/lib/livekit-host";
import { isLivekitConfigured } from "@/lib/livekit";
import { obsParticipantIdentity } from "@/lib/live-participant";
import { parseRtmpForObs } from "@/lib/obs-rtmp-parse";

export function isLivekitIngressConfigured() {
  return isLivekitConfigured() && !!getLivekitApiHost();
}

function createIngressClient() {
  return new IngressClient(
    getLivekitApiHost(),
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );
}

/** 같은 방(room)에 남은 인그레스 정리 — 무료 플랜 동시 2개 한도 */
async function cleanupRoomIngresses(channelId: string) {
  try {
    const client = createIngressClient();
    const list = await client.listIngress({ roomName: channelId });
    await Promise.all(list.map((ing) => client.deleteIngress(ing.ingressId)));
  } catch (e) {
    console.warn("[cleanupRoomIngresses]", e);
  }
}

function normalizeIngressCredentials(info: IngressInfo): { url: string; streamKey: string } | null {
  const row = info as IngressInfo & { stream_key?: string };
  const rawUrl = (info.url || "").trim();
  const rawKey = (info.streamKey || row.stream_key || "").trim();
  const parsed = parseRtmpForObs(rawUrl, rawKey);
  if (!parsed?.server || !parsed.streamKey) return null;
  return { url: parsed.server, streamKey: parsed.streamKey };
}

async function findExistingRoomIngress(channelId: string) {
  try {
    const client = createIngressClient();
    const list = await client.listIngress({ roomName: channelId });
    for (const ing of list) {
      const creds = normalizeIngressCredentials(ing);
      if (creds) {
        return { ingressId: ing.ingressId, url: creds.url, streamKey: creds.streamKey };
      }
    }
  } catch (e) {
    console.warn("[findExistingRoomIngress]", e);
  }
  return null;
}

/** OBS용 RTMP 인그레스 생성 (방송마다 독립 room = 동시 방송) */
export async function createObsRtmpIngress(
  channelId: string,
  hostName: string,
  options?: { cleanupFirst?: boolean }
): Promise<
  | { ingressId: string; url: string; streamKey: string }
  | { error: string }
> {
  if (!isLivekitIngressConfigured()) {
    return { error: "LiveKit Ingress가 설정되지 않았습니다. LIVEKIT_* 환경 변수를 확인하세요." };
  }

  const createOnce = async () => {
    const client = createIngressClient();
    return client.createIngress(IngressInput.RTMP_INPUT, {
      name: `mocomo-${channelId.slice(0, 12)}`,
      roomName: channelId,
      participantIdentity: obsParticipantIdentity(channelId),
      participantName: hostName,
      enableTranscoding: true,
    });
  };

  try {
    if (!options?.cleanupFirst) {
      const existing = await findExistingRoomIngress(channelId);
      if (existing) return existing;
    } else {
      await cleanupRoomIngresses(channelId);
    }

    const info = await createOnce();
    const creds = normalizeIngressCredentials(info);
    if (!creds) {
      return { error: "RTMP URL/스트림 키를 받지 못했습니다. LiveKit Ingress 플랜을 확인하세요." };
    }
    return { ingressId: info.ingressId, url: creds.url, streamKey: creds.streamKey };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/ingress|quota|limit/i.test(msg)) {
      await cleanupRoomIngresses(channelId);
      try {
        const info = await createOnce();
        const creds = normalizeIngressCredentials(info);
        if (creds) {
          return { ingressId: info.ingressId, url: creds.url, streamKey: creds.streamKey };
        }
      } catch (retryErr) {
        console.error("[createObsRtmpIngress] retry", retryErr);
      }
      const reused = await findExistingRoomIngress(channelId);
      if (reused) return reused;
    }
    console.error("[createObsRtmpIngress]", e);
    return { error: msg || "OBS 인그레스 생성 실패" };
  }
}

export async function deleteObsRtmpIngress(ingressId: string) {
  if (!isLivekitIngressConfigured() || !ingressId) return;
  try {
    const client = createIngressClient();
    await client.deleteIngress(ingressId);
  } catch (e) {
    console.error("[deleteObsRtmpIngress]", e);
  }
}
