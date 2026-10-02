import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { Avatar2dStudio } from "@/components/avatar/avatar-2d-studio";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const metadata = {
  title: t("app.avatar.2d_mocomo"),
  description: t("app.avatar.png_png_obs"),
};

export default async function Avatar2dStudioPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/avatar/studio/2d");

  return <Avatar2dStudio />;
}
