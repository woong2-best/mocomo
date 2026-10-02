import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

/** OBS — Cloudflare Stream Live (RTMPS) */
export function LiveObsCloudflareGuide({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[11px] text-orange-900 dark:text-orange-100 bg-orange-500/10 rounded-lg px-2 py-1.5 leading-relaxed">
        <strong>Cloudflare Stream.</strong> {t("live.obs_mocomo")} <strong>{t("live.sxvqg")}</strong>(RTMPS) · <strong>{t("live.soir95o")}</strong> 입력 후{" "}
        <strong>{t("live.s1dub35p")}</strong>{t("live.vultr_ip_livekit")}
      </p>
    );
  }

  return (
    <div className="text-[11px] text-orange-900 dark:text-orange-100 bg-orange-500/10 border border-orange-500/25 rounded-lg px-3 py-2.5 space-y-1.5 leading-relaxed">
      <p className="font-semibold">{t("live.obs_cloudflare_stream_live_cdn")}</p>
      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
        <li>{t("live.s2zu6xo")}</li>
        <li>{t("live.mocomo_3")} <code className="text-[10px]">rtmps://live.cloudflare.com:443/live</code>)</li>
        <li>{t("live.mocomo_4")}</li>
        <li>{t("live.2_obs")}</li>
      </ol>
    </div>
  );
}
