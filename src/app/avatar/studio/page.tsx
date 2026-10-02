import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { redirect } from "next/navigation";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const metadata = {
  title: t("app.avatar.mocomo_3"),
  description: t("live.liveStudio"),
};

/** Legacy avatar studio hub → live studio */
export default function AvatarStudioHubPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  redirect("/live/studio");
}
