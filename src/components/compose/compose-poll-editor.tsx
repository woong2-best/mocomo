"use client";

import { useState } from "react";
import { BarChart3, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_POLL_DURATION_MINUTES,
  POST_POLL_DURATION_OPTIONS,
  type CreatePostPollInput,
} from "@/lib/post-poll";
import { cn } from "@/lib/utils";

type ComposePollEditorProps = {
  value: CreatePostPollInput | null;
  onChange: (poll: CreatePostPollInput | null) => void;
  disabled?: boolean;
};

export function ComposePollEditor({ value, onChange, disabled }: ComposePollEditorProps) {
  const [enabled, setEnabled] = useState(!!value);
  const poll = value ?? {
    options: ["", ""],
    durationMinutes: DEFAULT_POLL_DURATION_MINUTES,
  };

  function toggle(on: boolean) {
    setEnabled(on);
    onChange(on ? { options: ["", ""], durationMinutes: DEFAULT_POLL_DURATION_MINUTES } : null);
  }

  function updateOptions(next: string[]) {
    onChange({ ...poll, options: next });
  }

  function updateDuration(minutes: number) {
    onChange({ ...poll, durationMinutes: minutes });
  }

  if (!enabled) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => toggle(true)}
        className="w-full rounded-xl gap-2 border-dashed"
      >
        <BarChart3 className="h-4 w-4" />
        투표 추가
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-primary" />
          투표
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => toggle(false)}
          className="h-8 px-2 text-muted-foreground"
        >
          <X className="h-4 w-4" />
          제거
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        본문이 투표 질문이 됩니다 · 선택지 2~4개 · 마감 후 결과 공개
      </p>

      <div className="space-y-2">
        {poll.options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={opt}
              disabled={disabled}
              maxLength={50}
              placeholder={`선택지 ${i + 1}`}
              className="rounded-lg h-9 text-sm"
              onChange={(e) => {
                const next = [...poll.options];
                next[i] = e.target.value;
                updateOptions(next);
              }}
            />
            {poll.options.length > 2 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={disabled}
                className="shrink-0 h-9 w-9 rounded-lg"
                aria-label={`선택지 ${i + 1} 삭제`}
                onClick={() => updateOptions(poll.options.filter((_, j) => j !== i))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {poll.options.length < 4 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="rounded-lg h-8 gap-1"
          onClick={() => updateOptions([...poll.options, ""])}
        >
          <Plus className="h-3.5 w-3.5" />
          선택지 추가
        </Button>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">마감 시간</label>
        <div className="flex flex-wrap gap-1.5">
          {POST_POLL_DURATION_OPTIONS.map((d) => (
            <button
              key={d.minutes}
              type="button"
              disabled={disabled}
              onClick={() => updateDuration(d.minutes)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                poll.durationMinutes === d.minutes
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary/40"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
