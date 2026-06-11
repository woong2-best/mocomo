export function liveWatchUrl(channelId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/voice/${channelId}`;
  }
  return `/voice/${channelId}`;
}

export function buildLiveShareMessage(channelName: string, channelId: string): string {
  const url = liveWatchUrl(channelId);
  return `🔴 ${channelName} 라이브 시청하기\n${url}`;
}

export function buildLivePostDraft(channelName: string, channelId: string): string {
  const url = liveWatchUrl(channelId);
  return `${channelName} 방송 중! 같이 봐요 🔴\n${url}`;
}
