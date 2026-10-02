"use client";

import { cn } from "@/lib/utils";
import type { GamePlayMode } from "@/lib/games-lobby";
import { Gamepad2, Users, Globe } from "lucide-react";

export function GamePlayModeTabs({
  mode,
  onChange,
  className,
}: {
  mode: GamePlayMode;
  onChange: (mode: GamePlayMode) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 p-1 rounded-xl border-2 border-folk-cobalt/20 bg-folk-cream/40",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange("friends")}
        className={cn(
          "flex flex-col items-center gap-1 rounded-lg px-3 py-3 text-xs font-semibold transition-colors",
          mode === "friends"
            ? "bg-folk-terracotta text-white shadow-folk-sm"
            : "text-folk-cobalt hover:bg-folk-gold/20"
        )}
      >
        <Users className="h-4 w-4" />
        친구 · 팔로워
        <span className={cn("text-[10px] font-normal", mode === "friends" ? "text-white/85" : "text-muted-foreground")}>
          방 코드 · 비밀번호
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChange("match")}
        className={cn(
          "flex flex-col items-center gap-1 rounded-lg px-3 py-3 text-xs font-semibold transition-colors",
          mode === "match"
            ? "bg-folk-cobalt text-white shadow-folk-sm"
            : "text-folk-cobalt hover:bg-folk-gold/20"
        )}
      >
        <Globe className="h-4 w-4" />
        랜덤 매칭
        <span className={cn("text-[10px] font-normal", mode === "match" ? "text-white/85" : "text-muted-foreground")}>
          모르는 유저와
        </span>
      </button>
    </div>
  );
}

export function GameLobbyHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center space-y-2 max-w-lg mx-auto">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-folk-terracotta/15 border-2 border-folk-cobalt/20">
        <Gamepad2 className="h-6 w-6 text-folk-terracotta" />
      </div>
      <h1 className="text-xl font-display font-bold">{title}</h1>
      {description && <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>}
    </div>
  );
}
