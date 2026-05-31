import { RoomServiceClient } from "livekit-server-sdk";
import { getLivekitApiHost } from "@/lib/livekit-host";
import { isLivekitIngressConfigured } from "@/lib/livekit-ingress";
import { livePublisherIdentities, obsParticipantIdentity } from "@/lib/live-participant";

function createRoomClient() {
  return new RoomServiceClient(
    getLivekitApiHost(),
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );
}

/** LiveKit 방 — 브라우저 호스트 또는 OBS(RTMP) 송출 여부 */
export async function probeLivekitRoomPublish(
  channelId: string,
  hostUserId?: string
): Promise<{
  onAir: boolean;
  playable: boolean;
  publisherIdentity?: string;
}> {
  if (!isLivekitIngressConfigured()) {
    return { onAir: false, playable: false };
  }

  try {
    const client = createRoomClient();
    const participants = await client.listParticipants(channelId);
    const identities = hostUserId
      ? livePublisherIdentities(channelId, hostUserId)
      : [obsParticipantIdentity(channelId)];

    for (const id of identities) {
      const p = participants.find((x) => x.identity === id);
      if (!p) continue;
      const trackCount = p.tracks?.length ?? 0;
      return {
        onAir: true,
        playable: trackCount > 0,
        publisherIdentity: id,
      };
    }
    return { onAir: false, playable: false };
  } catch (e) {
    console.warn("[probeLivekitRoomPublish]", channelId, e);
    return { onAir: false, playable: false };
  }
}

/** @deprecated OBS 전용 — probeLivekitRoomPublish 사용 */
export async function probeLivekitObsPublish(channelId: string) {
  return probeLivekitRoomPublish(channelId);
}
