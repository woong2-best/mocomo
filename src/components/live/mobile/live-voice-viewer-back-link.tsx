"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveMobilePortrait } from "@/hooks/use-live-mobile-portrait";

/** 시청자 — 모바일 세로 풀스크린에서는 상단 X로 나가므로 뒤로가기 숨김 */
export function LiveVoiceViewerBackLink() {
  const mobilePortrait = useLiveMobilePortrait();
  if (mobilePortrait) return null;

  return (
    <Link href="/live">
      <Button variant="ghost" size="sm" className="gap-1">
        <ChevronLeft className="h-4 w-4" />
        라이브 목록
      </Button>
    </Link>
  );
}
