import { db } from "@/lib/db";
import { notifyFollowersOnLive } from "@/lib/live-notify";
import { obsParticipantIdentity } from "@/lib/live-participant";

/** LiveKit 송출자 입장 — LIVE 전환 (OBS RTMP 또는 브라우저 호스트) */
export async function onLivekitObsJoined(roomName: string, identity: string) {
  const expectedObs = obsParticipantIdentity(roomName);
  const isObs = identity === expectedObs || identity.startsWith("obs-");

  const channel = await db.voiceChannel.findUnique({
    where: { id: roomName },
    select: {
      id: true,
      createdBy: true,
      name: true,
      isLive: true,
      broadcastMode: true,
    },
  });
  if (!channel) return;

  const isBrowserHost =
    channel.broadcastMode === "BROWSER" && identity === channel.createdBy;
  const isVoiceHost =
    channel.broadcastMode === "VOICE" && identity === channel.createdBy;
  if (!isObs && !isBrowserHost && !isVoiceHost) return;
  if (channel.broadcastMode === "BROWSER" && isObs) return;

  const wasLive = channel.isLive;
  await db.voiceChannel.update({
    where: { id: channel.id },
    data: { isLive: true, liveStatus: "LIVE" },
  });

  if (!wasLive) {
    void notifyFollowersOnLive(channel.createdBy, channel.id, channel.name).catch(() => {});
  }
}

/** LiveKit 송출자 퇴장 — 오프라인 (브라우저 호스트는 방송 종료 버튼 우선) */
export async function onLivekitObsLeft(roomName: string, identity: string) {
  const expectedObs = obsParticipantIdentity(roomName);
  const isObs = identity === expectedObs || identity.startsWith("obs-");

  const channel = await db.voiceChannel.findUnique({
    where: { id: roomName },
    select: { createdBy: true, broadcastMode: true },
  });
  if (!channel) return;

  const isBrowserHost =
    channel.broadcastMode === "BROWSER" && identity === channel.createdBy;
  const isVoiceHost =
    channel.broadcastMode === "VOICE" && identity === channel.createdBy;
  if (!isObs && !isBrowserHost && !isVoiceHost) return;
  if (channel.broadcastMode === "BROWSER" && isObs) return;

  try {
    await db.voiceChannel.update({
      where: { id: roomName },
      data: { isLive: false },
    });
  } catch (e) {
    console.error("[onLivekitObsLeft]", roomName, e);
  }
}
