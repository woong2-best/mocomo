import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { getStreamerProfile } from "@/actions/streamer";
import { StreamerSettingsForm } from "@/components/live/streamer-settings-form";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export default async function StreamerSettingsPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/settings/streamer");

  const profile = await getStreamerProfile().catch(() => null);

  return (
    <AppPageChrome spacing="sm">
      <h1 className="text-xl font-bold">{t("settings.sc5py3w")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("settings.s1emwjjs")}
      </p>
      <Link
        href="/settings/streaming-accounts"
        className="inline-flex text-sm font-medium text-primary hover:underline"
      >
        {t("settings.s93jpme")}
      </Link>
      <Link
        href="/live/studio"
        className="inline-flex text-sm font-medium text-primary hover:underline"
      >
        {t("settings.s1qa6jd2")}
      </Link>
      <StreamerSettingsForm
        initial={{
          bio: profile?.bio ?? "",
          announcement: profile?.announcement ?? "",
          scheduleNote: profile?.scheduleNote ?? "",
        }}
      />
    </AppPageChrome>
  );
}
