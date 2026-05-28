"use client";

import { useState } from "react";
import type { HumanChallengeQuestion } from "@/lib/human-challenge-types";
import { Button } from "@/components/ui/button";

type SignupHumanChallengeProps = {
  challenge: HumanChallengeQuestion;
  loading?: boolean;
  onRefresh: () => void;
  onSelect: (choiceId: string) => void;
  selectedId: string;
};

export function SignupHumanChallenge({
  challenge,
  loading,
  onRefresh,
  onSelect,
  selectedId,
}: SignupHumanChallengeProps) {
  const [shake, setShake] = useState(false);

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-emerald-500/10 to-sky-500/10 border border-border p-4 text-center">
        <p className="text-xs font-medium text-muted-foreground mb-1">사람인지 확인 · 무료 퀴즈</p>
        <p className="text-lg font-bold">{challenge.prompt}</p>
        {challenge.hint ? (
          <p className="text-xs text-muted-foreground mt-1">{challenge.hint}</p>
        ) : null}
      </div>
      <div
        className={`grid grid-cols-2 gap-2 ${shake ? "animate-pulse" : ""}`}
        onAnimationEnd={() => setShake(false)}
      >
        {challenge.choices.map((c) => (
          <Button
            key={c.id}
            type="button"
            variant={selectedId === c.id ? "default" : "outline"}
            className="rounded-xl h-auto py-3 text-sm font-medium"
            disabled={loading}
            onClick={() => {
              onSelect(c.id);
              setShake(false);
            }}
          >
            {c.label}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-xs text-muted-foreground"
        disabled={loading}
        onClick={onRefresh}
      >
        다른 문제로 바꾸기
      </Button>
    </div>
  );
}
