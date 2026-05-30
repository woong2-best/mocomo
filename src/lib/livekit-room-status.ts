import { RoomServiceClient } from "livekit-server-sdk";
import { getLivekitApiHost } from "@/lib/livekit-host";
import { isLivekitIngressConfigured } from "@/lib/livekit-ingress";
import { obsParticipantIdentity } from "@/lib/live-participant";

function createRoomClient() {
  return new RoomServiceClient(
    getLivekitApiHost(),
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );
}

/** LiveKit 방에 OBS(RTMP) 참가자가 있는지 */
export async function probeLivekitObsPublish(channelId: string): Promise<{
  onAir: boolean;
  playable: boolean;
}> {
  if (!isLivekitIngressConfigured()) {
    return { onAir: false, playable: false };
  }

  try {
    const client = createRoomClient();
    const participants = await client.listParticipants(channelId);
    const obsId = obsParticipantIdentity(channelId);
    const obs = participants.find((p) => p.identity === obsId);
    if (!obs) return { onAir: false, playable: false };

    const hasMedia = (obs.tracks?.length ?? 0) > 0;
    return { onAir: true, playable: hasMedia };
  } catch (e) {
    console.warn("[probeLivekitObsPublish]", channelId, e);
    return { onAir: false, playable: false };
  }
}
