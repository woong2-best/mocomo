"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
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
      <Link href="/voice/new">
        <Button className="gap-2 rounded-xl">
          <Video className="h-4 w-4" />
          방송 만들기
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/voice/new">
      <Button>방송 만들기</Button>
    </Link>
  );
}
