"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { MonitorPlay, Radio, Video } from "lucide-react";
import {
  isExternalLiveEnabled,
  isFirstPartyLiveEnabled,
  isLiveFeatureEnabled,
} from "@/lib/live-feature";
import { useLocale } from "@/components/providers/locale-provider";

export function LivePageActions({ variant }: { variant: "header" | "empty" }) {
  const sessionState = useSession();
  const session = sessionState?.data;
  const { t } = useLocale();

  if (!isLiveFeatureEnabled()) return null;

  const externalOn = isExternalLiveEnabled();
  const firstPartyOn = isFirstPartyLiveEnabled();

  const wrap =
    variant === "header"
      ? "flex flex-wrap gap-2 justify-end"
      : "flex flex-wrap gap-2 justify-center";

  const studioButton = (
    <Link href={session?.user ? "/avatar/studio" : "/auth/signin?callbackUrl=/avatar/studio"}>
      <Button variant="outline" className="gap-2 rounded-xl">
        <MonitorPlay className="h-4 w-4" />
        {t("live.liveStudio")}
      </Button>
    </Link>
  );

  if (!session?.user) {
    return (
      <div className={wrap}>
        {studioButton}
        {externalOn ? (
          <Link href="/auth/signin?callbackUrl=/live/external/new">
            <Button className="gap-2 rounded-xl shadow-sm">{t("live.loginToBroadcast")}</Button>
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className={wrap}>
      {studioButton}
      {externalOn ? (
        <Link href="/live/external/new">
          <Button className="gap-2 rounded-xl shadow-sm">
            <Video className="h-4 w-4" />
            {t("live.startBroadcast")}
          </Button>
        </Link>
      ) : null}
      {firstPartyOn ? (
        <Link href="/voice/new">
          <Button variant="outline" className="gap-2 rounded-xl">
            <Radio className="h-4 w-4" />
            자체 송출
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
