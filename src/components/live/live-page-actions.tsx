"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Mic2, Radio, Video } from "lucide-react";
import { getLiveHostEligibilityAction } from "@/actions/live-stream";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { LIVE_HOST_MIN_FOLLOWERS } from "@/lib/creator-follower-badge";

export function LivePageActions({ variant }: { variant: "header" | "empty" }) {
  const { data: session } = useSession();
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    void getLiveHostEligibilityAction().then((res) => {
      setEligible(res.eligible);
      setMessage(res.message);
    });
  }, [session?.user]);

  if (!isLiveFeatureEnabled() || !session?.user) return null;

  if (eligible === false) {
    if (variant === "header") {
      return (
        <p className="text-xs text-muted-foreground max-w-[220px] text-right leading-snug">
          방송은 팔로워 {LIVE_HOST_MIN_FOLLOWERS.toLocaleString()}명+ (실버)부터
        </p>
      );
    }
    return (
      <p className="text-sm text-muted-foreground text-center max-w-md mx-auto">
        {message ?? `라이브 방송은 팔로워 ${LIVE_HOST_MIN_FOLLOWERS.toLocaleString()}명 이상(실버 크리에이터)만 시작할 수 있습니다.`}
      </p>
    );
  }

  if (eligible !== true) return null;

  if (variant === "header") {
    return (
      <div className="flex flex-wrap gap-2 justify-end">
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
