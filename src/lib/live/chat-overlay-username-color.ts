/** VTuber 스타일 채팅 — 닉네임별 고정 색 */
export function chatOverlayUsernameColor(username: string): string {
  const hues = [330, 145, 275, 42, 195, 12, 260, 180];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${hues[Math.abs(hash) % hues.length]!} 88% 72%)`;
}
