/** OBS — Cloudflare Stream Live (RTMPS) */
export function LiveObsCloudflareGuide({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[11px] text-orange-900 dark:text-orange-100 bg-orange-500/10 rounded-lg px-2 py-1.5 leading-relaxed">
        <strong>Cloudflare Stream.</strong> OBS 「설정 → 방송」에 MoCoMo <strong>서버</strong>(RTMPS) · <strong>방송 키</strong> 입력 후{" "}
        <strong>방송 시작</strong>. Vultr IP·LiveKit 불필요.
      </p>
    );
  }

  return (
    <div className="text-[11px] text-orange-900 dark:text-orange-100 bg-orange-500/10 border border-orange-500/25 rounded-lg px-3 py-2.5 space-y-1.5 leading-relaxed">
      <p className="font-semibold">OBS → Cloudflare Stream Live (트위치급 CDN)</p>
      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
        <li>설정 → 방송 → 서비스 「사용자 지정」</li>
        <li>서버 = MoCoMo 「서버」(보통 <code className="text-[10px]">rtmps://live.cloudflare.com:443/live</code>)</li>
        <li>방송 키 = MoCoMo 「방송 키」 (한 칸에 합치지 말 것)</li>
        <li>키프레임 간격 2초 권장 · OBS 「방송 시작」</li>
      </ol>
    </div>
  );
}
