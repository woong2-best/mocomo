"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

type Ach = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
};

export function MinigameAchievementsClient() {
  const { isNativeApp } = useClientPlatform();
  const [items, setItems] = useState<Ach[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    void fetch("/api/minigames/achievements")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((d) => setItems(d.achievements ?? []))
      .catch(() => setLoadError("업적을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className={cn("text-2xl font-display font-bold", isNativeApp && "sr-only")}>업적</h1>
        <Link href="/games" className="text-xs text-muted-foreground hover:underline">
          ← 허브
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {loadError ? (
          <p className="col-span-full text-sm text-destructive text-center py-6">{loadError}</p>
        ) : loading
          ? [1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))
          : items.map((a) => (
          <Card key={a.id} className={a.unlocked ? "border-folk-gold/40 bg-folk-gold/5" : "opacity-70"}>
            <CardContent className="p-4 flex gap-3 items-start">
              <span className="text-2xl">{a.icon}</span>
              <div>
                <p className="font-semibold">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
                {a.unlocked && a.unlockedAt && (
                  <p className="text-[10px] text-emerald-600 mt-1">달성</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
