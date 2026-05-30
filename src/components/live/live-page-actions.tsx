"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export function LivePageActions({ variant }: { variant: "header" | "empty" }) {
  const { data: session } = useSession();
  if (!isLiveFeatureEnabled() || !session?.user) return null;

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
