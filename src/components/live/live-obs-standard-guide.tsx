import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

/** OBS 기본 방송 설정 — 트위치/유튜브와 동일 (LiveKit Cloud RTMP → WebRTC 시청) */
export function LiveObsStandardGuide({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[11px] text-violet-800 dark:text-violet-200 bg-violet-500/10 rounded-lg px-2 py-1.5 leading-relaxed">
        <strong>{t("live.s1p16dza")}</strong> {t("live.obs_16")} <strong>{t("live.sxvqg")}</strong>·<strong>{t("live.soir95o")}</strong>
        {t("live.obs.afterEnter")}{" "}
        <strong>{t("live.ssg87i4")}</strong>{t("live.vps")}
      </p>
    );
  }

  return (
    <div className="text-[11px] text-violet-900 dark:text-violet-100 bg-violet-500/10 border border-violet-500/25 rounded-lg px-3 py-2.5 space-y-1.5 leading-relaxed">
      <p className="font-semibold">{t("live.obs_livekit")}</p>
      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
        <li>{t("live.obs_17")}</li>
        <li>{t("live.mocomo_mocomo")}</li>
        <li>{t("live.obs_18")} <strong>{t("live.ssg87i4")}</strong> {t("live.s10h4p")}</li>
        <li>{t("live.3_10_webrtc_hls_vps")}</li>
      </ol>
      <p className="text-[10px] opacity-90">
        {t("live.s1q4qj9i")}
      </p>
    </div>
  );
}
