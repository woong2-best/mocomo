"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, MessageSquare, Heart } from "lucide-react";
import {
  getDiscoveryMatches,
  markDiscoveryMatchesSeen,
  openDiscoveryChat,
} from "@/actions/discovery";
import type { DiscoveryMatchRow } from "@/lib/discovery/types";
import { Button } from "@/components/ui/button";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function DiscoveryMatchList() {
  const router = useRouter();
  const { isNativeApp } = useClientPlatform();
  const listPb = cn("max-w-lg mx-auto px-4", !isNativeApp && "pb-nav lg:pb-6");
  const [rows, setRows] = useState<DiscoveryMatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [chatError, setChatError] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    void getDiscoveryMatches()
      .then((r) => {
        setRows(r);
        setLoading(false);
      })
      .catch(() => {
        setLoadError("매칭 목록을 불러오지 못했습니다.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loading || rows.length === 0) return;
    const timer = window.setTimeout(() => {
      void markDiscoveryMatchesSeen();
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [loading, rows.length]);

  async function openChat(userId: string) {
    setOpening(userId);
    setChatError("");
    const res = await openDiscoveryChat(userId);
    setOpening(null);
    if (res && "error" in res && res.error) {
      setChatError(res.error);
      return;
    }
    if (res && "roomId" in res && res.roomId) {
      router.push(`/messages/${res.roomId}`);
    }
  }

  if (loadError) {
    return (
      <div className="text-center py-16 space-y-4 px-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => {
            setLoading(true);
            setLoadError("");
            void getDiscoveryMatches()
              .then((r) => setRows(r))
              .catch(() => setLoadError("매칭 목록을 불러오지 못했습니다."))
              .finally(() => setLoading(false));
          }}
        >
          다시 시도
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 rounded-full border-2 border-folk-terracotta border-t-transparent animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={cn(listPb, "text-center py-20 space-y-4")}>
        <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
          <Heart className="h-9 w-9 text-muted-foreground/40" />
        </div>
        <p className="font-semibold text-lg">아직 매칭이 없어요</p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          서로 좋아요하면 여기에 나타나요. 카드를 스와이프해 보세요.
        </p>
        <Button asChild className="rounded-full bg-folk-terracotta text-white hover:bg-folk-terracotta/90">
          <Link href="/discover">스와이프 하러 가기</Link>
        </Button>
      </div>
    );
  }

  const newMatches = rows.filter((r) => r.unseen);
  const rest = rows.filter((r) => !r.unseen);

  return (
    <div className={cn(listPb, "space-y-8 pt-4")}>
      {chatError && <p className="text-center text-sm text-destructive">{chatError}</p>}

      {newMatches.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-folk-terracotta tracking-wide uppercase">New Matches</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
            {newMatches.map((m) => {
              const photo = m.cosplayPhoto || m.image;
              const name = m.name || m.username;
              return (
                <button
                  key={m.matchId}
                  type="button"
                  disabled={opening === m.userId}
                  onClick={() => void openChat(m.userId)}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]"
                >
                  <div className="relative h-[72px] w-[72px] rounded-full p-[3px] bg-folk-terracotta">
                    <div className="relative h-full w-full rounded-full overflow-hidden bg-muted ring-2 ring-background">
                      {photo ? (
                        <Image src={photo} alt="" fill className="object-cover" sizes="72px" />
                      ) : (
                        <div className="h-full w-full bg-folk-terracotta/40" />
                      )}
                    </div>
                    {m.isCosplayer && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-folk-terracotta flex items-center justify-center ring-2 ring-background">
                        <Camera className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium truncate w-full text-center text-muted-foreground">
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-muted-foreground tracking-wide uppercase">Messages</h2>
        <ul className="space-y-1">
          {(rest.length > 0 ? rest : rows).map((m) => {
            const photo = m.cosplayPhoto || m.image;
            const name = m.name || m.username;
            return (
              <li key={m.matchId}>
                <button
                  type="button"
                  disabled={opening === m.userId}
                  onClick={() => void openChat(m.userId)}
                  className="w-full flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="relative h-14 w-14 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
                    {photo ? (
                      <Image src={photo} alt="" fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="h-full w-full bg-folk-terracotta/30" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.bio || `@${m.username}`}</p>
                  </div>
                  <MessageSquare className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
