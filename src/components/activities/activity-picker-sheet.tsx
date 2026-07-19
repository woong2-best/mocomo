"use client";

import { listActivities } from "@/lib/activities/registry";
import { useActivity } from "@/components/activities/activity-provider";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function ActivityPickerSheet() {
  const { pickerOpen, closePicker, inviteActivity, peerUserId } = useActivity();
  const activities = listActivities();

  if (!pickerOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="닫기"
        onClick={closePicker}
      />
      <div
        className={cn(
          "relative z-[1] w-full sm:max-w-md max-h-[78vh] overflow-hidden",
          "rounded-t-2xl sm:rounded-2xl border-2 border-folk-cobalt/25 bg-background shadow-folk",
          "animate-in slide-in-from-bottom-4 duration-200"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div>
            <p className="text-base font-bold text-foreground">Play Together</p>
            <p className="text-[11px] text-muted-foreground">대화를 유지한 채 함께 즐겨요</p>
          </div>
          <button
            type="button"
            onClick={closePicker}
            className="rounded-lg p-1.5 hover:bg-muted"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(78vh-3.5rem)] p-3 grid grid-cols-2 gap-2">
          {activities.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={!a.playable || !peerUserId}
              onClick={() => inviteActivity(a.id)}
              className={cn(
                "text-left rounded-xl border-2 px-3 py-3 transition-all",
                a.playable
                  ? "border-folk-cobalt/20 bg-folk-cream/40 hover:border-folk-terracotta/50 hover:-translate-y-0.5"
                  : "border-border/40 bg-muted/30 opacity-60 cursor-not-allowed"
              )}
            >
              <span className="text-xl leading-none">{a.icon}</span>
              <p className="mt-1.5 text-sm font-bold text-foreground">{a.title}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                {a.playable ? a.description : "곧 플레이 가능"}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
