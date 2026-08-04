"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Radio, Video } from "lucide-react";
import {
  isExternalLiveEnabled,
  isFirstPartyLiveEnabled,
  isLiveFeatureEnabled,
} from "@/lib/live-feature";

export function LivePageActions({ variant }: { variant: "header" | "empty" }) {
  const sessionState = useSession();
  const session = sessionState?.data;

  if (!isLiveFeatureEnabled()) return null;

  const externalOn = isExternalLiveEnabled();
  const firstPartyOn = isFirstPartyLiveEnabled();

  const wrap =
    variant === "header"
      ? "flex flex-wrap gap-2 justify-end"
      : "flex flex-wrap gap-2 justify-center";

  if (!session?.user) {
    return externalOn ? (
      <div className={wrap}>
        <Link href="/auth/signin">
          <Button className="gap-2 rounded-xl">로그인 후 방송 연결</Button>
        </Link>
      </div>
    ) : null;
  }

  return (
    <div className={wrap}>
      {externalOn ? (
        <Link href="/live/external/new">
          <Button className="gap-2 rounded-xl">
            <Video className="h-4 w-4" />
            외부 방송 연결
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
