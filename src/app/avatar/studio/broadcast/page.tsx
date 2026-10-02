import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { redirect } from "next/navigation";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const metadata = {
  title: t("app.avatar.mocomo_2"),
  description: t("live.liveStudio"),
};

/** Legacy broadcast studio → live studio */
export default function BroadcastStudioPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  redirect("/live/studio");
}
