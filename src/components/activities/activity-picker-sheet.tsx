"use client";

import {
  canPickActivity,
  listActivitiesForPicker,
} from "@/lib/activities/picker-utils";
import { useActivity } from "@/components/activities/activity-provider";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function ActivityPickerSheet() {
  const { pickerOpen, closePicker, pickActivity, peerUserId } = useActivity();
  const isDm = !!peerUserId;
  const activities = listActivitiesForPicker(isDm);

  function onPickActivity(activityId: string) {
    void pickActivity(activityId);
  }

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
            <p className="text-[11px] text-muted-foreground">
              {isDm
                ? "2인 게임은 바로 시작 · 채팅에 초대 카드가 올라갑니다"
                : "로비에서 함께 모여요 · 채팅에 초대 카드가 올라갑니다"}
            </p>
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
          {activities.map((a) => {
            const pickable = canPickActivity(a, isDm);
            const playerHint =
              a.minPlayers >= 3
                ? `커뮤니티 · ${a.minPlayers}~${a.maxPlayers}인`
                : isDm
                  ? "1:1 바로 시작"
                  : `${a.minPlayers}~${a.maxPlayers}인 · 로비`;

            return (
              <button
                key={a.id}
                type="button"
                disabled={!pickable}
                onClick={() => onPickActivity(a.id)}
                className={cn(
                  "text-left rounded-xl border-2 px-3 py-3 transition-all",
                  pickable
                    ? "border-folk-cobalt/20 bg-folk-cream/40 hover:border-folk-terracotta/50 hover:-translate-y-0.5"
                    : "border-border/40 bg-muted/30 opacity-60 cursor-not-allowed"
                )}
              >
                <span className="text-xl leading-none">{a.icon}</span>
                <p className="mt-1.5 text-sm font-bold text-foreground">{a.title}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                  {pickable ? playerHint : "곧 플레이 가능"}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
