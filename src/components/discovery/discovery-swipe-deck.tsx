"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, X, RotateCcw, Settings, Users } from "lucide-react";
import Link from "next/link";
import { DiscoveryCardView } from "@/components/discovery/discovery-card";
import { Button } from "@/components/ui/button";
import type { DiscoveryCard } from "@/lib/discovery/types";
import { discoverySwipe, getDiscoveryDeck } from "@/actions/discovery";
import { cn } from "@/lib/utils";

export function DiscoverySwipeDeck() {
  const [cards, setCards] = useState<DiscoveryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [matchFlash, setMatchFlash] = useState(false);
  const [actError, setActError] = useState("");
  const [lastAction, setLastAction] = useState<{ card: DiscoveryCard; action: "PASS" | "LIKE" | "CHEER" } | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getDiscoveryDeck();
    if ("enabled" in res && !res.enabled) {
      setEnabled(false);
      setReason(res.reason);
      setCards([]);
    } else if ("cards" in res) {
      setEnabled(true);
      setCards(res.cards);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = cards[0];
  const next = cards[1];

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);
  const cheerOpacity = useTransform(y, [-120, -40], [1, 0]);

  async function act(action: "PASS" | "LIKE" | "CHEER") {
    if (!current || busy) return;
    setBusy(true);
    setActError("");
    setLastAction({ card: current, action });
    const res = await discoverySwipe(current.userId, action);
    if ("error" in res) {
      setActError(res.error);
      setBusy(false);
      return;
    }
    if (res.matched) {
      setMatchFlash(true);
      setTimeout(() => setMatchFlash(false), 1800);
    }
    setCards((prev) => prev.slice(1));
    x.set(0);
    y.set(0);
    setBusy(false);
    if (cards.length <= 3) void load();
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y < -100) {
      void act("CHEER");
      return;
    }
    if (info.offset.x > 100) void act("LIKE");
    else if (info.offset.x < -100) void act("PASS");
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70dvh] gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">취향 맞는 사람 찾는 중…</p>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-16 px-4">
        <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold">MoCoMo 매칭</h2>
          <p className="text-sm text-muted-foreground">{reason}</p>
          <p className="text-xs text-muted-foreground">
            원하는 분만 참여 · 거리·나이·취향 필터 · 코스어·친구 추천
          </p>
        </div>
        <Button asChild className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600">
          <Link href="/discover/settings">매칭 참여 설정</Link>
        </Button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-20 px-4">
        <Users className="h-12 w-12 mx-auto text-muted-foreground" />
        <p className="font-semibold">오늘 추천을 모두 확인했어요</p>
        <p className="text-sm text-muted-foreground">내일 새로운 추천이 올라옵니다. 필터를 넓히면 더 많이 볼 수 있어요.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => void load()}>
            <RotateCcw className="h-4 w-4 mr-1" /> 새로고침
          </Button>
          <Button asChild variant="secondary" className="rounded-xl">
            <Link href="/discover/settings">필터 설정</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-md mx-auto px-3 pb-8">
      <AnimatePresence>
        {matchFlash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none"
          >
            <div className="text-center space-y-3 px-6">
              <Sparkles className="h-16 w-16 mx-auto text-yellow-300 animate-pulse" />
              <p className="text-3xl font-black text-white">매칭!</p>
              <p className="text-white/80 text-sm">서로 관심 있어요 · 메시지를 보내보세요</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative h-[min(72dvh,560px)] flex items-center justify-center">
        {next && (
          <div className="absolute inset-x-4 top-4 scale-[0.96] opacity-50 blur-[0.3px]">
            <DiscoveryCardView card={next} />
          </div>
        )}

        <motion.div
          className="relative z-10 w-full touch-none cursor-grab active:cursor-grabbing"
          style={{ x, y, rotate }}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.9}
          onDragEnd={onDragEnd}
          whileTap={{ scale: 1.01 }}
        >
          <DiscoveryCardView card={current} />

          <motion.span
            style={{ opacity: likeOpacity }}
            className="absolute top-8 left-8 border-4 border-emerald-400 text-emerald-400 font-black text-2xl px-3 py-1 rounded-lg rotate-[-12deg]"
          >
            LIKE
          </motion.span>
          <motion.span
            style={{ opacity: passOpacity }}
            className="absolute top-8 right-8 border-4 border-red-400 text-red-400 font-black text-2xl px-3 py-1 rounded-lg rotate-[12deg]"
          >
            NOPE
          </motion.span>
          <motion.span
            style={{ opacity: cheerOpacity }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 border-4 border-amber-400 text-amber-300 font-black text-xl px-3 py-1 rounded-lg"
          >
            ㅊㅊ
          </motion.span>
        </motion.div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground mt-2 mb-4">
        ← 넘기기 · → 좋아요 · ↑ ㅊㅊ(팔로우) · 버튼으로도 가능
      </p>

      {actError && (
        <p className="text-center text-sm text-destructive mb-2">{actError}</p>
      )}

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("PASS")}
          className={cn(
            "h-14 w-14 rounded-full border-2 border-red-400/60 bg-black/40 flex items-center justify-center",
            "hover:bg-red-500/20 active:scale-95 transition-transform shadow-lg"
          )}
          aria-label="넘기기"
        >
          <X className="h-7 w-7 text-red-400" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("CHEER")}
          className={cn(
            "h-12 w-12 rounded-full border-2 border-amber-400/70 bg-gradient-to-br from-amber-500/30 to-orange-600/30",
            "flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg font-bold text-sm text-amber-100"
          )}
          aria-label="응원"
        >
          ㅊㅊ
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("LIKE")}
          className={cn(
            "h-14 w-14 rounded-full border-2 border-emerald-400/60 bg-black/40 flex items-center justify-center",
            "hover:bg-emerald-500/20 active:scale-95 transition-transform shadow-lg"
          )}
          aria-label="좋아요"
        >
          <Heart className="h-7 w-7 text-emerald-400 fill-emerald-400/30" />
        </button>
      </div>

      {lastAction && (
        <p className="text-center text-[10px] text-muted-foreground mt-3">
          {lastAction.action === "CHEER" && "ㅊㅊ · 팔로우 완료"}
          {lastAction.action === "LIKE" && "관심 보냄"}
          {lastAction.action === "PASS" && "다음 추천"}
        </p>
      )}

      <div className="flex justify-center gap-2 mt-6">
        <Button asChild variant="ghost" size="sm" className="rounded-lg text-xs">
          <Link href="/discover/matches">
            <Users className="h-3.5 w-3.5 mr-1" /> 매칭 목록
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="rounded-lg text-xs">
          <Link href="/discover/settings">
            <Settings className="h-3.5 w-3.5 mr-1" /> 설정
          </Link>
        </Button>
      </div>
    </div>
  );
}
