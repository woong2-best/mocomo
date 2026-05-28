/** 방송 생성 실패 메시지 (DB·인증 등) */
export function formatLiveCreateError(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "UNAUTHORIZED") return "로그인이 필요합니다.";
    if (e.message === "BANNED") return "이용이 제한된 계정입니다.";
    const msg = e.message;
    if (
      /LiveStreamCategory|LiveStreamStatus|LiveBroadcastMode|joinPassword|StreamerProfile|VoiceMember|enum|column/i.test(
        msg
      )
    ) {
      return "라이브 DB가 아직 준비되지 않았습니다. Supabase SQL Editor에서 supabase-fix-all.sql R·U 섹션을 실행해 주세요.";
    }
    if (msg.length > 0 && msg.length < 180) return msg;
  }
  return "방송을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
