/** 방송 생성 실패 메시지 (DB·인증 등) */
export function formatLiveCreateError(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "UNAUTHORIZED") return "로그인이 필요합니다.";
    if (e.message === "BANNED") return "이용이 제한된 계정입니다.";
    const msg = e.message;
    const missingCol = msg.match(
      /column [`'"]?(?:\w+\.)?(\w+)[`'"]? does not exist/i
    );
    if (missingCol?.[1]) {
      return `라이브 DB 컬럼이 없습니다 (${missingCol[1]}). 배포 후 자동 마이그레이션을 확인하거나 Supabase에서 supabase-fix-all.sql AC 섹션을 실행해 주세요.`;
    }
    if (
      /LiveStreamCategory|LiveStreamStatus|LiveBroadcastMode|LiveVisibility|joinPassword|StreamerProfile|VoiceMember|enum/i.test(
        msg
      )
    ) {
      return "라이브 DB가 아직 준비되지 않았습니다. Supabase SQL Editor에서 supabase-fix-all.sql R·U·AC 섹션을 실행해 주세요.";
    }
    if (msg.length > 0 && msg.length < 180) return msg;
  }
  return "방송을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
