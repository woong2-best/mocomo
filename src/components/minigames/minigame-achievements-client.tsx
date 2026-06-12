"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

type Ach = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
};

export function MinigameAchievementsClient() {
  const [items, setItems] = useState<Ach[]>([]);

  useEffect(() => {
    void fetch("/api/minigames/achievements")
      .then((r) => r.json())
      .then((d) => setItems(d.achievements ?? []));
  }, []);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">업적</h1>
        <Link href="/games" className="text-xs text-muted-foreground hover:underline">
          ← 허브
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((a) => (
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
