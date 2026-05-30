/** OBS 기본 방송 설정 — 트위치/유튜브와 동일 (LiveKit Cloud RTMP → WebRTC 시청) */
export function LiveObsStandardGuide({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[11px] text-violet-800 dark:text-violet-200 bg-violet-500/10 rounded-lg px-2 py-1.5 leading-relaxed">
        <strong>트위치 방식.</strong> OBS 「설정 → 방송」에 아래 <strong>서버</strong>·<strong>방송 키</strong> 입력 후{" "}
        <strong>「방송 시작」</strong>만 누르면 됩니다. VPS·다중 송출 플러그인 없이 동작합니다.
      </p>
    );
  }

  return (
    <div className="text-[11px] text-violet-900 dark:text-violet-100 bg-violet-500/10 border border-violet-500/25 rounded-lg px-3 py-2.5 space-y-1.5 leading-relaxed">
      <p className="font-semibold">OBS 기본 방송 (LiveKit — 트위치/유튜브와 같은 방식)</p>
      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
        <li>OBS → 설정 → 방송 → 서비스 「사용자 지정」</li>
        <li>서버 = MoCoMo 「서버」, 방송 키 = MoCoMo 「방송 키」 (한 칸에 합치지 말 것)</li>
        <li>적용 후 OBS 하단 <strong>「방송 시작」</strong> 클릭</li>
        <li>3~10초 뒤 스튜디오·시청 화면에 WebRTC로 표시 (HLS/VPS 불필요)</li>
      </ol>
      <p className="text-[10px] opacity-90">
        다중 송출 플러그인을 쓰는 경우에도 같은 서버·키를 대상에 넣으면 됩니다.
      </p>
    </div>
  );
}
