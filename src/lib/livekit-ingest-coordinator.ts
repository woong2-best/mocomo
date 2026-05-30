import { db } from "@/lib/db";
import { notifyFollowersOnLive } from "@/lib/live-notify";
import { obsParticipantIdentity } from "@/lib/live-participant";

/** LiveKit OBS 참가자 입장 — LIVE 전환 */
export async function onLivekitObsJoined(roomName: string, identity: string) {
  const expected = obsParticipantIdentity(roomName);
  if (identity !== expected && !identity.startsWith("obs-")) return;

  const channel = await db.voiceChannel.findUnique({
    where: { id: roomName },
    select: { id: true, createdBy: true, name: true, isLive: true },
  });
  if (!channel) return;

  const wasLive = channel.isLive;
  await db.voiceChannel.update({
    where: { id: channel.id },
    data: { isLive: true, liveStatus: "LIVE" },
  });

  if (!wasLive) {
    void notifyFollowersOnLive(channel.createdBy, channel.id, channel.name).catch(() => {});
  }
}

/** LiveKit OBS 퇴장 — 오프라인 */
export async function onLivekitObsLeft(roomName: string, identity: string) {
  const expected = obsParticipantIdentity(roomName);
  if (identity !== expected && !identity.startsWith("obs-")) return;

  try {
    await db.voiceChannel.update({
      where: { id: roomName },
      data: { isLive: false },
    });
  } catch (e) {
    console.error("[onLivekitObsLeft]", roomName, e);
  }
}
