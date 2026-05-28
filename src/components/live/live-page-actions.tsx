"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

export function LivePageActions({ variant }: { variant: "header" | "empty" }) {
  const { data: session } = useSession();
  if (!session?.user) return null;

  if (variant === "header") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href="/live/clips/new">
          <Button variant="outline" className="rounded-xl gap-1 text-xs sm:text-sm">
            클립 업로드
          </Button>
        </Link>
        <Link href="/voice/new">
          <Button className="gap-2 rounded-xl">
            <Video className="h-4 w-4" />
            방송 시작
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Link href="/voice/new">
      <Button>방송 시작하기</Button>
    </Link>
  );
}
