"use client";

import Link from "next/link";
import { Gamepad2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";

/** 라이브 스튜디오 — 별도 페이지 게임 링크 */
export function LiveGamesHubLink({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-white/20 bg-black/50 p-2 flex flex-wrap gap-2"
          : "rounded-xl border border-border bg-muted/30 p-3 flex flex-wrap gap-2 items-center"
      }
    >
      <span className={`text-xs font-bold ${compact ? "text-white/80" : "text-muted-foreground"}`}>
        <Gamepad2 className="h-3.5 w-3.5 inline mr-1" />
        더 많은 게임
      </span>
      <Link href="/sketch-quiz" target="_blank" rel="noopener noreferrer">
        <Button type="button" size="sm" variant={compact ? "secondary" : "outline"} className="rounded-lg h-8 gap-1">
          <PencilLine className="h-3.5 w-3.5" />
          스케치퀴즈
        </Button>
      </Link>
    </div>
  );
}
