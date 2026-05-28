import { IngressClient, IngressInput } from "livekit-server-sdk";
import { getLivekitApiHost } from "@/lib/livekit-host";
import { isLivekitConfigured } from "@/lib/livekit";
import { obsParticipantIdentity } from "@/lib/live-participant";

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

/** OBS용 RTMP 인그레스 생성 (방송마다 독립 room = 동시 방송) */
export async function createObsRtmpIngress(
  channelId: string,
  hostName: string
): Promise<
  | { ingressId: string; url: string; streamKey: string }
  | { error: string }
> {
  if (!isLivekitIngressConfigured()) {
    return { error: "LiveKit Ingress가 설정되지 않았습니다. LIVEKIT_* 환경 변수를 확인하세요." };
  }

  try {
    const client = createIngressClient();
    const info = await client.createIngress(IngressInput.RTMP_INPUT, {
      name: `mocomo-${channelId.slice(0, 12)}`,
      roomName: channelId,
      participantIdentity: obsParticipantIdentity(channelId),
      participantName: hostName,
      enableTranscoding: true,
    });

    const url = info.url || "";
    const streamKey = info.streamKey || "";
    if (!url || !streamKey) {
      return { error: "RTMP URL/스트림 키를 받지 못했습니다. LiveKit Ingress 플랜을 확인하세요." };
    }

    return { ingressId: info.ingressId, url, streamKey };
  } catch (e) {
    console.error("[createObsRtmpIngress]", e);
    return { error: e instanceof Error ? e.message : "OBS 인그레스 생성 실패" };
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
