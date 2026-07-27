"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Mic2, Radio, Sparkles, Video } from "lucide-react";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { useLocale } from "@/components/providers/locale-provider";

export function LivePageActions({ variant }: { variant: "header" | "empty" }) {
  const sessionState = useSession();
  const session = sessionState?.data;
  const { t } = useLocale();

  if (!isLiveFeatureEnabled()) return null;

  const studioButton = (
    <Link href="/avatar/studio">
      <Button variant="outline" className={variant === "header" ? "gap-2 rounded-xl" : "gap-2"}>
        <Sparkles className="h-4 w-4" />
        {t("nav.liveStudio")}
      </Button>
    </Link>
  );

  if (!session?.user) {
    return (
      <div className={variant === "header" ? "flex flex-wrap gap-2 justify-end" : "flex flex-wrap gap-2 justify-center"}>
        {studioButton}
      </div>
    );
  }

  if (variant === "header") {
    return (
      <div className="flex flex-wrap gap-2 justify-end">
        {studioButton}
        <Link href="/voice/new?mode=voice">
          <Button variant="outline" className="gap-2 rounded-xl">
            <Mic2 className="h-4 w-4" />
            보이스
          </Button>
        </Link>
        <Link href="/voice/new">
          <Button className="gap-2 rounded-xl">
            <Video className="h-4 w-4" />
            영상 방송
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {studioButton}
      <Link href="/voice/new?mode=voice">
        <Button variant="outline" className="gap-2">
          <Mic2 className="h-4 w-4" />
          보이스 라이브
        </Button>
      </Link>
      <Link href="/voice/new">
        <Button className="gap-2">
          <Radio className="h-4 w-4" />
          영상 방송
        </Button>
      </Link>
    </div>
  );
}
