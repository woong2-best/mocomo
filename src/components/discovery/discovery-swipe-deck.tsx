"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, X, RotateCcw, Settings, Users, UserRound, Shuffle } from "lucide-react";
import Link from "next/link";
import { DiscoveryCardView } from "@/components/discovery/discovery-card";
import { Button } from "@/components/ui/button";
import type { DiscoveryCard } from "@/lib/discovery/types";
import type { DiscoveryMatchingMode } from "@prisma/client";
import { discoverySwipe, getDiscoveryDeck, openDiscoveryChat, setDiscoveryMatchingMode } from "@/actions/discovery";
import { DISCOVERY_MATCHING_LABELS, DISCOVERY_MATCHING_UI_OPTIONS } from "@/lib/discovery/constants";
import { vibrateLightTap, vibrateSuccess } from "@/lib/haptics";
import { MotionBurst } from "@/components/motion/motion-primitives";
import { pressTap } from "@/lib/motion-presets";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function DiscoverySwipeDeck() {
  const router = useRouter();
  const { isNativeApp } = useClientPlatform();
  const deckPb = cn(
    "relative max-w-md mx-auto px-3",
    isNativeApp
      ? "pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))]"
      : "pb-[max(2rem,env(safe-area-inset-bottom))]"
  );
  const [cards, setCards] = useState<DiscoveryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [matchFlash, setMatchFlash] = useState(false);
  const [actError, setActError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [matchedUserId, setMatchedUserId] = useState<string | null>(null);
  const [openingMatchChat, setOpeningMatchChat] = useState(false);
  const [matchingMode, setMatchingMode] = useState<DiscoveryMatchingMode>("RECOMMENDED");
  const [modeBusy, setModeBusy] = useState(false);
  const [lastAction, setLastAction] = useState<{ card: DiscoveryCard; action: "PASS" | "LIKE" | "CHEER" } | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getDiscoveryDeck();
      if ("enabled" in res && !res.enabled) {
        setEnabled(false);
        setReason(res.reason);
        setCards([]);
      } else if ("cards" in res) {
        setEnabled(true);
        setCards(res.cards);
        setMatchingMode(res.matchingMode);
      }
    } catch {
      setLoadError("추천을 불러오지 못했습니다.");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function switchMatchingMode(mode: DiscoveryMatchingMode) {
    if (mode === matchingMode || modeBusy || busy) return;
    setModeBusy(true);
    const res = await setDiscoveryMatchingMode(mode);
    if ("error" in res) {
      setActError(res.error);
      setModeBusy(false);
      return;
    }
    setMatchingMode(mode);
    await load();
    setModeBusy(false);
  }

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
    if (action === "PASS") vibrateLightTap();
    else if (action === "LIKE") vibrateLightTap(18);
    else vibrateSuccess();

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
      setMatchedUserId(current.userId);
      vibrateSuccess(40);
      setMatchFlash(true);
    }
    setCards((prev) => prev.slice(1));
    x.set(0);
    y.set(0);
    setBusy(false);
    if (cards.length <= 3) void load();
  }

  async function openMatchChat() {
    if (!matchedUserId) return;
    setOpeningMatchChat(true);
    const res = await openDiscoveryChat(matchedUserId);
    setOpeningMatchChat(false);
    setMatchFlash(false);
    setMatchedUserId(null);
    if (res && "error" in res && res.error) {
      setActError(res.error);
      return;
    }
    if (res && "roomId" in res && res.roomId) {
      router.push(`/messages/${res.roomId}`);
    }
  }

  function dismissMatchFlash() {
    setMatchFlash(false);
    setMatchedUserId(null);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y < -100) {
      void act("CHEER");
      return;
    }
    if (info.offset.x > 100) void act("LIKE");
    else if (info.offset.x < -100) void act("PASS");
  }

  if (loadError) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-20 px-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button variant="outline" className="rounded-xl" onClick={() => void load()}>
          <RotateCcw className="h-4 w-4 mr-1" /> 다시 시도
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70dvh] gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">
          {matchingMode === "RANDOM" ? "랜덤으로 사람 찾는 중…" : "취향 맞는 사람 찾는 중…"}
        </p>
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
        <p className="font-semibold">
          {matchingMode === "RANDOM" ? "오늘 랜덤 추천을 모두 확인했어요" : "오늘 추천을 모두 확인했어요"}
        </p>
        <p className="text-sm text-muted-foreground">
          {matchingMode === "RANDOM"
            ? "새로고침하면 다른 사람이 나올 수 있어요."
            : "내일 새로운 추천이 올라옵니다. 필터를 넓히면 더 많이 볼 수 있어요."}
        </p>
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
    <div className={deckPb}>
      <div className="flex justify-center px-1 mb-3">
        <div className="inline-flex rounded-xl border border-violet-500/20 bg-muted/30 p-1 gap-1">
          {DISCOVERY_MATCHING_UI_OPTIONS.map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={modeBusy || busy}
              onClick={() => void switchMatchingMode(mode)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors inline-flex items-center gap-1",
                matchingMode === mode
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "RANDOM" ? <Shuffle className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {DISCOVERY_MATCHING_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {matchFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={dismissMatchFlash}
          >
            <MotionBurst
              className="text-center space-y-4 px-6 pointer-events-auto"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <Sparkles className="h-16 w-16 mx-auto text-yellow-300" />
              </motion.div>
              <p className="text-3xl font-black text-white">매칭!</p>
              <p className="text-white/80 text-sm">서로 관심 있어요 · 메시지를 보내세요</p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold"
                  disabled={openingMatchChat}
                  onClick={() => void openMatchChat()}
                >
                  {openingMatchChat ? "연결 중…" : "메시지 보내기"}
                </Button>
                <Button asChild variant="secondary" className="rounded-xl">
                  <Link href="/discover/matches" onClick={dismissMatchFlash}>
                    매칭 목록
                  </Link>
                </Button>
                <Button variant="ghost" className="rounded-xl text-white/70" onClick={dismissMatchFlash}>
                  계속 보기
                </Button>
              </div>
            </MotionBurst>
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
          <DiscoveryCardView card={current} draggable={false} />

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
        {matchingMode === "RANDOM"
          ? "완전 랜덤 · 필터 없음 · ← 넘기기 · → 좋아요 · ↑ ㅊㅊ"
          : "← 넘기기 · → 좋아요 · ↑ ㅊㅊ(팔로우) · 버튼으로도 가능"}
      </p>

      {actError && (
        <p className="text-center text-sm text-destructive mb-2">{actError}</p>
      )}

      <div className="flex items-center justify-center gap-4">
        <motion.button
          type="button"
          disabled={busy}
          onClick={() => void act("PASS")}
          whileTap={pressTap}
          whileHover={{ scale: 1.06 }}
          className={cn(
            "h-14 w-14 rounded-full border-2 border-red-400/60 bg-black/40 flex items-center justify-center",
            "hover:bg-red-500/20 shadow-lg discover-action-btn discover-action-pass"
          )}
          aria-label="넘기기"
        >
          <X className="h-7 w-7 text-red-400" />
        </motion.button>
        <motion.button
          type="button"
          disabled={busy}
          onClick={() => void act("CHEER")}
          whileTap={pressTap}
          whileHover={{ scale: 1.08 }}
          className={cn(
            "h-12 w-12 rounded-full border-2 border-amber-400/70 bg-gradient-to-br from-amber-500/30 to-orange-600/30",
            "flex items-center justify-center shadow-lg font-bold text-sm text-amber-100 discover-action-btn discover-action-cheer"
          )}
          aria-label="응원"
        >
          ㅊㅊ
        </motion.button>
        <motion.button
          type="button"
          disabled={busy}
          onClick={() => void act("LIKE")}
          whileTap={pressTap}
          whileHover={{ scale: 1.06 }}
          className={cn(
            "h-14 w-14 rounded-full border-2 border-emerald-400/60 bg-black/40 flex items-center justify-center",
            "hover:bg-emerald-500/20 shadow-lg discover-action-btn discover-action-like"
          )}
          aria-label="좋아요"
        >
          <Heart className="h-7 w-7 text-emerald-400 fill-emerald-400/30" />
        </motion.button>
      </div>

      {lastAction && (
        <p className="text-center text-[10px] text-muted-foreground mt-3">
          {lastAction.action === "CHEER" && "ㅊㅊ · 팔로우 완료"}
          {lastAction.action === "LIKE" && "관심 보냄"}
          {lastAction.action === "PASS" && (matchingMode === "RANDOM" ? "다음 사람" : "다음 추천")}
        </p>
      )}

      <div className="flex justify-center gap-2 mt-4">
        {current && (
          <Button asChild variant="ghost" size="sm" className="rounded-lg text-xs">
            <Link href={`/u/${current.username}`}>
              <UserRound className="h-3.5 w-3.5 mr-1" /> 프로필
            </Link>
          </Button>
        )}
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
