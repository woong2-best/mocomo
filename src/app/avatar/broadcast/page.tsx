import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { AvatarBroadcastView, type BroadcastBgMode } from "@/components/avatar/avatar-broadcast-view";

export const metadata = {
  title: t("app.avatar.mocomo"),
  description: t("app.avatar.obs_vtuber"),
};

export default async function AvatarBroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{ bg?: string }>;
}) {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/avatar/broadcast");

  const params = await searchParams;
  const bg: BroadcastBgMode =
    params.bg === "chroma" ? "chroma" : params.bg === "normal" ? "normal" : "transparent";

  return <AvatarBroadcastView bgMode={bg} />;
}
