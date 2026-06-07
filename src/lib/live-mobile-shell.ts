/** /voice/[id] 모바일 세로 라이브 — 앱 하단 탭 숨김 */
export function isLiveVoiceRoomPath(pathname: string): boolean {
  return /^\/voice\/[^/]+$/.test(pathname) && pathname !== "/voice/new";
}
