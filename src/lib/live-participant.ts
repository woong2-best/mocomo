/** OBS(RTMP) 송출 시 LiveKit 참가자 ID — 방(channel)마다 고유 → 동시 다중 방송 가능 */
export function obsParticipantIdentity(channelId: string) {
  return `obs-${channelId}`;
}

/** 시청·프리뷰 시 구독할 퍼블리셔 identity 목록 (브라우저 호스트 또는 OBS) */
export function livePublisherIdentities(channelId: string, hostUserId: string) {
  return [hostUserId, obsParticipantIdentity(channelId)];
}
