import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

/** OBS Multiple RTMP(다중 송출) — MoCoMo 전용 대상 설정 */
export function LiveObsMultiRtmpGuide({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[11px] text-sky-800 dark:text-sky-200 bg-sky-500/10 rounded-lg px-2 py-1.5 leading-relaxed">
        <strong>{t("live.saafb8h")}</strong> {t("live.s1er1iwc")} <strong>{t("live.sxvqg")}</strong>·<strong>{t("live.soir95o")}</strong>{t("live.mocomo_sorayuki")}
      </p>
    );
  }

  return (
    <div className="text-[11px] text-sky-900 dark:text-sky-100 bg-sky-500/10 border border-sky-500/25 rounded-lg px-3 py-2.5 space-y-1.5 leading-relaxed">
      <p className="font-semibold">{t("live.multiple_rtmp_mocomo")}</p>
      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
        <li>{t("live.obs_6")}</li>
        <li>
          {t("live.s1b7g128")} <strong>{t("live.sdwye2k")}</strong> {t("live.s1jvhf7g")}
        </li>
        <li>{t("live.obs_mocomo_3")}</li>
      </ol>
      <p className="text-[10px] opacity-90">
        {t("live.quot_author_sorayuki_quot")}
      </p>
    </div>
  );
}
