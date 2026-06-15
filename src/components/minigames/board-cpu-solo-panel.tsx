"use client";

import { Bot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AI_DIFFICULTY_OPTIONS,
  type MinigameAiDifficulty,
} from "@/lib/minigames/minigame-cpu";
import { MIN_GAME_ROOM_PASSWORD_LENGTH } from "@/lib/games-lobby";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  password: string;
  onPasswordChange: (v: string) => void;
  difficulty: MinigameAiDifficulty;
  onDifficultyChange: (d: MinigameAiDifficulty) => void;
  error: string | null;
  onStart: () => void;
  extraOptions?: React.ReactNode;
};

export function BoardCpuSoloPanel({
  title,
  description,
  icon: Icon,
  password,
  onPasswordChange,
  difficulty,
  onDifficultyChange,
  error,
  onStart,
  extraOptions,
}: Props) {
  return (
    <div className="space-y-4 max-w-md mx-auto">
      <Card className="border-2 border-folk-terracotta/30">
        <CardContent className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <Icon className="h-10 w-10 mx-auto text-folk-terracotta" />
            <h2 className="font-display font-bold text-lg">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {extraOptions}
          <div className="grid grid-cols-3 gap-2">
            {AI_DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onDifficultyChange(opt.id)}
                className={cn(
                  "rounded-xl border-2 px-2 py-3 text-center transition-colors",
                  difficulty === opt.id
                    ? "border-folk-terracotta bg-folk-terracotta/10"
                    : "border-muted hover:border-folk-cobalt/30"
                )}
              >
                <span className="block text-xs font-bold">{opt.label}</span>
                <span className="block text-[10px] text-muted-foreground mt-1 leading-tight">{opt.hint}</span>
              </button>
            ))}
          </div>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder={`방 비밀번호 (${MIN_GAME_ROOM_PASSWORD_LENGTH}자 이상)`}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
          <Button className="w-full rounded-xl gap-2" onClick={onStart}>
            <Bot className="h-4 w-4" />
            {AI_DIFFICULTY_OPTIONS.find((o) => o.id === difficulty)?.label} CPU와 대국
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function BoardCpuModeTabs({
  tab,
  onTab,
}: {
  tab: "solo" | "multi";
  onTab: (t: "solo" | "multi") => void;
}) {
  return (
    <div className="flex justify-center gap-1 p-1 rounded-xl bg-muted/60 max-w-xs mx-auto">
      <button
        type="button"
        onClick={() => onTab("multi")}
        className={cn(
          "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1",
          tab === "multi" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        대전
      </button>
      <button
        type="button"
        onClick={() => onTab("solo")}
        className={cn(
          "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1",
          tab === "solo" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Bot className="h-3.5 w-3.5" />
        vs CPU
      </button>
    </div>
  );
}
