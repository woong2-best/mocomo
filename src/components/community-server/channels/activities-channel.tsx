"use client";

import { useMemo, useState } from "react";
import { listActivities, getActivityById } from "@/lib/activities/registry";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Gamepad2, Users } from "lucide-react";

/**
 * Community Activities — 음성 채널과 독립적으로 동작.
 * Voice는 종료하지 않으며, 이 화면에서 Join만 처리합니다.
 */
export function ActivitiesChannelView({
  communitySlug,
  communityId,
}: {
  communitySlug: string;
  communityId: string;
}) {
  const activities = useMemo(() => listActivities(), []);
  const [joinedId, setJoinedId] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);

  function join(activityId: string) {
    const def = getActivityById(activityId);
    if (!def?.playable) return;
    setJoinedId(activityId);
    setPlayers((prev) => {
      if (prev.some((p) => p.id === "me")) return prev;
      return [...prev, { id: "me", name: "나" }];
    });
  }

  function leave() {
    setJoinedId(null);
    setPlayers([]);
  }

  const joined = joinedId ? getActivityById(joinedId) : null;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
      <div className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-folk-terracotta">
          Activities
        </p>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-folk-cobalt" />
          Play Together
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
          커뮤니티를 떠나지 않고 함께 즐깁니다. 음성 채널에 접속 중이라면 음성은 그대로 유지됩니다.
        </p>
        <p className="text-[10px] text-muted-foreground/80">
          {communitySlug} · {communityId.slice(0, 8)}
        </p>
      </div>

      {joined && (
        <section className="rounded-2xl border-2 border-folk-terracotta/30 bg-folk-cream/50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-sm">
              {joined.icon} {joined.title}
            </p>
            <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={leave}>
              Leave
            </Button>
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 mb-1.5">
              <Users className="h-3.5 w-3.5" />
              Players
            </p>
            <ul className="space-y-1">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-folk-cobalt/15 bg-background px-3 py-1.5 text-sm font-medium"
                >
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            DM처럼 인채팅 보드로 확장할 수 있는 Activity 세션입니다. 친구를 초대해 함께 플레이하세요.
          </p>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activities.map((a) => (
          <article
            key={a.id}
            className={cn(
              "rounded-2xl border-2 p-4 space-y-2 transition-colors",
              joinedId === a.id
                ? "border-folk-terracotta bg-folk-cream/40"
                : "border-folk-cobalt/20 bg-card hover:border-folk-terracotta/40"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-2xl">{a.icon}</span>
              {!a.playable && (
                <span className="text-[10px] font-bold text-muted-foreground rounded-full border px-2 py-0.5">
                  Soon
                </span>
              )}
            </div>
            <h2 className="font-bold text-sm">{a.title}</h2>
            <p className="text-[11px] text-muted-foreground line-clamp-2">{a.description}</p>
            <p className="text-[10px] text-muted-foreground">
              {a.minPlayers}–{a.maxPlayers}인
            </p>
            <Button
              type="button"
              size="sm"
              className="w-full rounded-xl"
              disabled={!a.playable}
              onClick={() => join(a.id)}
            >
              {joinedId === a.id ? "Joined" : "Join Activity"}
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
