export function obsStudioReadyKey(channelId: string): string {
  return `mocomo_obs_studio_ready_${channelId}`;
}

export function isObsStudioReady(channelId: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(obsStudioReadyKey(channelId)) === "1";
}

export function setObsStudioReady(channelId: string): void {
  sessionStorage.setItem(obsStudioReadyKey(channelId), "1");
}

export function clearObsStudioReady(channelId: string): void {
  sessionStorage.removeItem(obsStudioReadyKey(channelId));
}
