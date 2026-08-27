export function getJitsiDomain(): string {
  return process.env.NEXT_PUBLIC_JITSI_DOMAIN?.trim() || "meet.jit.si";
}

export function getJitsiRoomPrefix(): string {
  return process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX?.trim() || "mocomo-";
}

export function buildJitsiRoomName(channelId: string): string {
  return `${getJitsiRoomPrefix()}${channelId}`;
}

export function isJitsiConfigured(): boolean {
  return !!getJitsiDomain();
}
