"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, MessageCircle, Sparkles } from "lucide-react";
import {
  getDiscoveryMatches,
  markDiscoveryMatchesSeen,
  openDiscoveryChat,
} from "@/actions/discovery";
import type { DiscoveryMatchRow } from "@/lib/discovery/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DiscoveryMatchList() {
  const router = useRouter();
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
    void markDiscoveryMatchesSeen();
  }, []);

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
          className="rounded-xl"
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
    return <p className="text-center text-sm text-muted-foreground py-16">불러오는 중…</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 space-y-4 px-4">
        <Sparkles className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="font-semibold">아직 매칭이 없어요</p>
        <p className="text-sm text-muted-foreground">좋아요·ㅊㅊ가 서로 맞으면 여기에 표시됩니다.</p>
        <Button asChild className="rounded-xl">
          <Link href="/discover">추천 보러 가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3 p-4 max-w-lg mx-auto pb-24">
      {chatError && (
        <p className="text-sm text-destructive text-center">{chatError}</p>
      )}
      {rows.map((m) => (
        <li key={m.matchId}>
          <Card className={cn("rounded-2xl overflow-hidden", m.unseen && "ring-2 ring-violet-500/50")}>
            <CardContent className="p-0">
              <div className="flex gap-3 p-3">
                <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-muted shrink-0">
                  {(m.cosplayPhoto || m.image) ? (
                    <Image src={m.cosplayPhoto || m.image!} alt="" fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-violet-600 to-fuchsia-700" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${m.username}`} className="font-bold hover:underline truncate block">
                    {m.name || m.username}
                  </Link>
                  <p className="text-xs text-muted-foreground">@{m.username}</p>
                  {m.isCosplayer && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-fuchsia-600 mt-0.5">
                      <Camera className="h-3 w-3" /> 코스어
                    </span>
                  )}
                  {m.bio && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{m.bio}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(m.matchedAt).toLocaleDateString("ko")} 매칭
                  </p>
                </div>
              </div>
              <div className="flex border-t divide-x">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 rounded-none h-11 text-sm"
                  disabled={opening === m.userId}
                  onClick={() => void openChat(m.userId)}
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  {opening === m.userId ? "연결 중…" : "메시지"}
                </Button>
                <Button asChild variant="ghost" className="flex-1 rounded-none h-11 text-sm">
                  <Link href={`/u/${m.username}`}>프로필</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
