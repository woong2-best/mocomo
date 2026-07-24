"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Mic2, Radio, Sparkles, Video } from "lucide-react";
import { getLiveHostEligibilityAction } from "@/actions/live-stream";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { LIVE_HOST_MIN_FOLLOWERS } from "@/lib/creator-follower-badge";
import { useLocale } from "@/components/providers/locale-provider";

export function LivePageActions({ variant }: { variant: "header" | "empty" }) {
  const sessionState = useSession();
  const session = sessionState?.data;
  const { t } = useLocale();
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    void getLiveHostEligibilityAction().then((res) => {
      setEligible(res.eligible);
      setMessage(res.message);
    });
  }, [session?.user]);

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

  if (eligible === false) {
    if (variant === "header") {
      return (
        <div className="flex flex-col items-end gap-2">
          {studioButton}
          <p className="text-xs text-muted-foreground max-w-[220px] text-right leading-snug">
            방송은 팔로워 {LIVE_HOST_MIN_FOLLOWERS.toLocaleString()}명+ (실버)부터
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-3">
        {studioButton}
        <p className="text-sm text-muted-foreground text-center max-w-md mx-auto">
          {message ?? `라이브 방송은 팔로워 ${LIVE_HOST_MIN_FOLLOWERS.toLocaleString()}명 이상(실버 크리에이터)만 시작할 수 있습니다.`}
        </p>
      </div>
    );
  }

  if (eligible !== true) {
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
