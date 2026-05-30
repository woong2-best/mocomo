/** OBS Multiple RTMP(다중 송출) — MoCoMo 전용 대상 설정 */
export function LiveObsMultiRtmpGuide({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[11px] text-sky-800 dark:text-sky-200 bg-sky-500/10 rounded-lg px-2 py-1.5 leading-relaxed">
        <strong>다중 송출 사용 OK.</strong> 플러그인 「새 대상」에 아래 <strong>서버</strong>·<strong>방송 키</strong>를
        각각 넣으면 메인 「방송 시작」 없이도 MoCoMo로 송출됩니다. (SoraYuki 안내 문구는 오류 아님)
      </p>
    );
  }

  return (
    <div className="text-[11px] text-sky-900 dark:text-sky-100 bg-sky-500/10 border border-sky-500/25 rounded-lg px-3 py-2.5 space-y-1.5 leading-relaxed">
      <p className="font-semibold">다중 송출(Multiple RTMP)로 MoCoMo 방송 — 지원합니다</p>
      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
        <li>OBS 켜면 플러그인이 자동 송출하는 구조면 그대로 쓰셔도 됩니다.</li>
        <li>
          다중 송출 → <strong>대상 수정</strong> → 서버 = 위 「서버」만, 스트림 키 = 위 「방송 키」만 (한 칸에
          합치지 말 것)
        </li>
        <li>메인 OBS 「설정→방송」은 트위치 등 다른 곳용이어도 됩니다. MoCoMo는 플러그인 대상만 맞으면 됩니다.</li>
      </ol>
      <p className="text-[10px] opacity-90">
        플러그인 하단 &quot;Author: SoraYuki&quot; 문구는 제작자 표시일 뿐, 오류가 아닙니다.
      </p>
    </div>
  );
}
