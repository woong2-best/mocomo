"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from "framer-motion";
import { Heart, Star, X, RotateCcw, Shuffle, Sparkles, Flame } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { DiscoveryCardView } from "@/components/discovery/discovery-card";
import { Button } from "@/components/ui/button";
import type { DiscoveryCard } from "@/lib/discovery/types";
import type { DiscoveryMatchingMode } from "@prisma/client";
import {
  discoverySwipe,
  getDiscoveryDeck,
  openDiscoveryChat,
  setDiscoveryMatchingMode,
  undoDiscoverySwipe,
} from "@/actions/discovery";
import { DISCOVERY_MATCHING_LABELS, DISCOVERY_MATCHING_UI_OPTIONS } from "@/lib/discovery/constants";
import { vibrateLightTap, vibrateSuccess } from "@/lib/haptics";
import { pressTap } from "@/lib/motion-presets";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 110;
const EXIT_X = 480;

type ExitDir = "left" | "right" | "up" | null;

export function DiscoverySwipeDeck() {
  const router = useRouter();
  const { isNativeApp } = useClientPlatform();
  const deckPb = cn(
    "relative max-w-md mx-auto px-3 w-full",
    isNativeApp
      ? "pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))]"
      : "pb-[max(1.5rem,env(safe-area-inset-bottom))]"
  );

  const [cards, setCards] = useState<DiscoveryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [matchFlash, setMatchFlash] = useState(false);
  const [matchedCard, setMatchedCard] = useState<DiscoveryCard | null>(null);
  const [actError, setActError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [openingMatchChat, setOpeningMatchChat] = useState(false);
  const [matchingMode, setMatchingMode] = useState<DiscoveryMatchingMode>("RECOMMENDED");
  const [modeBusy, setModeBusy] = useState(false);
  const [lastPassed, setLastPassed] = useState<DiscoveryCard | null>(null);
  const [exitDir, setExitDir] = useState<ExitDir>(null);
  const [cardExpanded, setCardExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getDiscoveryDeck();
      if ("error" in res) {
        setLoadError(res.error);
        setCards([]);
      } else if ("enabled" in res && !res.enabled) {
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
  const rotate = useTransform(x, [-200, 200], [-16, 16]);
  const likeOpacity = useTransform(x, [30, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -30], [1, 0]);
  const cheerOpacity = useTransform(y, [-120, -40], [1, 0]);
  const likeScale = useTransform(x, [0, 140], [0.85, 1]);
  const passScale = useTransform(x, [-140, 0], [1, 0.85]);

  async function commitSwipe(action: "PASS" | "LIKE" | "CHEER", card: DiscoveryCard) {
    setBusy(true);
    setActError("");
    setCardExpanded(false);

    if (action === "PASS") vibrateLightTap();
    else if (action === "LIKE") vibrateLightTap(18);
    else vibrateSuccess();

    const res = await discoverySwipe(card.userId, action);
    if ("error" in res) {
      setActError(res.error);
      setExitDir(null);
      x.set(0);
      y.set(0);
      setBusy(false);
      return;
    }

    if (action === "PASS") setLastPassed(card);
    else setLastPassed(null);

    if (res.matched) {
      setMatchedCard(card);
      vibrateSuccess(40);
      setMatchFlash(true);
    }

    setCards((prev) => prev.slice(1));
    setExitDir(null);
    x.set(0);
    y.set(0);
    setBusy(false);

    if (cards.length <= 3) void load();
  }

  async function act(action: "PASS" | "LIKE" | "CHEER") {
    if (!current || busy || exitDir) return;
    const dir: ExitDir = action === "PASS" ? "left" : action === "LIKE" ? "right" : "up";
    setExitDir(dir);
    // Let exit animation start, then commit
    window.setTimeout(() => {
      void commitSwipe(action, current);
    }, 160);
  }

  async function rewind() {
    if (!lastPassed || busy) return;
    setBusy(true);
    setActError("");
    const res = await undoDiscoverySwipe(lastPassed.userId);
    if ("error" in res) {
      setActError(res.error);
      setBusy(false);
      return;
    }
    setCards((prev) => [lastPassed, ...prev]);
    setLastPassed(null);
    vibrateLightTap();
    setBusy(false);
  }

  async function openMatchChat() {
    if (!matchedCard) return;
    setOpeningMatchChat(true);
    const res = await openDiscoveryChat(matchedCard.userId);
    setOpeningMatchChat(false);
    setMatchFlash(false);
    setMatchedCard(null);
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
    setMatchedCard(null);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (busy || exitDir) return;
    if (info.offset.y < -SWIPE_THRESHOLD && Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
      void act("CHEER");
      return;
    }
    if (info.offset.x > SWIPE_THRESHOLD) void act("LIKE");
    else if (info.offset.x < -SWIPE_THRESHOLD) void act("PASS");
  }

  if (loadError) {
    return (
      <div className={cn(deckPb, "text-center space-y-4 py-20")}>
        <Flame className="h-12 w-12 mx-auto text-rose-500/80" />
        <p className="text-sm text-rose-300">{loadError}</p>
        <Button
          variant="outline"
          className="rounded-full border-white/20 bg-white/5"
          onClick={() => void load()}
        >
          <RotateCcw className="h-4 w-4 mr-1" /> 다시 시도
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70dvh] gap-3">
        <div className="h-11 w-11 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
        <p className="text-sm text-white/50">
          {matchingMode === "RANDOM" ? "랜덤으로 찾는 중…" : "취향 맞는 사람 찾는 중…"}
        </p>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className={cn(deckPb, "text-center space-y-6 py-16")}>
        <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-500/30">
          <Flame className="h-12 w-12 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-display font-black tracking-tight">MoCoMo 매칭</h2>
          <p className="text-sm text-white/60">{reason}</p>
          <p className="text-xs text-white/40">스와이프로 만나고 · 서로 좋아요하면 매칭</p>
        </div>
        <Button
          asChild
          className="rounded-full px-8 h-12 bg-gradient-to-r from-rose-500 to-orange-500 font-bold text-base shadow-lg shadow-rose-500/25"
        >
          <Link href="/discover/settings">매칭 시작하기</Link>
        </Button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className={cn(deckPb, "text-center space-y-4 py-20")}>
        <div className="mx-auto h-20 w-20 rounded-full bg-white/5 flex items-center justify-center ring-1 ring-white/10">
          <Heart className="h-9 w-9 text-white/30" />
        </div>
        <p className="font-semibold text-lg">
          {matchingMode === "RANDOM" ? "오늘 랜덤 카드를 다 봤어요" : "오늘 추천을 다 봤어요"}
        </p>
        <p className="text-sm text-white/50 max-w-xs mx-auto">
          {matchingMode === "RANDOM"
            ? "새로고침하면 다른 사람이 나올 수 있어요."
            : "필터를 넓히거나 내일 다시 와 보세요."}
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Button
            variant="outline"
            className="rounded-full border-white/15 bg-white/5"
            onClick={() => void load()}
          >
            <RotateCcw className="h-4 w-4 mr-1" /> 새로고침
          </Button>
          <Button asChild className="rounded-full bg-rose-500 hover:bg-rose-600">
            <Link href="/discover/settings">필터 설정</Link>
          </Button>
        </div>
      </div>
    );
  }

  const exitAnimate =
    exitDir === "left"
      ? { x: -EXIT_X, opacity: 0, rotate: -24 }
      : exitDir === "right"
        ? { x: EXIT_X, opacity: 0, rotate: 24 }
        : exitDir === "up"
          ? { y: -EXIT_X, opacity: 0, scale: 0.9 }
          : undefined;

  return (
    <div className={deckPb}>
      <div className="flex justify-center px-1 mb-3">
        <div className="inline-flex rounded-full border border-white/10 bg-black/40 p-1 gap-0.5 backdrop-blur">
          {DISCOVERY_MATCHING_UI_OPTIONS.map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={modeBusy || busy}
              onClick={() => void switchMatchingMode(mode)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors inline-flex items-center gap-1",
                matchingMode === mode
                  ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md"
                  : "text-white/45 hover:text-white/80"
              )}
            >
              {mode === "RANDOM" ? <Shuffle className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {DISCOVERY_MATCHING_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {matchFlash && matchedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-6"
            onClick={dismissMatchFlash}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="text-center space-y-6 max-w-sm w-full pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <p className="font-display text-4xl font-black italic tracking-tight bg-gradient-to-r from-rose-400 via-orange-300 to-amber-300 bg-clip-text text-transparent">
                  It&apos;s a Match!
                </p>
                <p className="mt-2 text-white/70 text-sm">
                  서로 관심 있어요 · {matchedCard.name || matchedCard.username}
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <div className="relative h-28 w-28 rounded-full overflow-hidden ring-4 ring-rose-400/80 shadow-xl">
                  {(matchedCard.cosplayPhoto || matchedCard.image) && (
                    <Image
                      src={matchedCard.cosplayPhoto || matchedCard.image!}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  )}
                </div>
                <Heart className="h-8 w-8 text-rose-400 fill-rose-400 animate-pulse" />
                <div className="relative h-28 w-28 rounded-full overflow-hidden ring-4 ring-orange-400/80 shadow-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
                  <Flame className="h-10 w-10 text-white" />
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Button
                  className="rounded-full h-12 bg-gradient-to-r from-rose-500 to-orange-500 font-bold text-base shadow-lg shadow-rose-500/30"
                  disabled={openingMatchChat}
                  onClick={() => void openMatchChat()}
                >
                  {openingMatchChat ? "연결 중…" : "메시지 보내기"}
                </Button>
                <Button
                  asChild
                  variant="secondary"
                  className="rounded-full h-11 bg-white/10 text-white hover:bg-white/15 border-0"
                >
                  <Link href="/discover/matches" onClick={dismissMatchFlash}>
                    매칭 목록
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full text-white/55 hover:text-white hover:bg-transparent"
                  onClick={dismissMatchFlash}
                >
                  계속 스와이프
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative h-[min(68dvh,560px)] w-full">
        {next && (
          <div className="absolute inset-0 scale-[0.96] opacity-40 translate-y-2 pointer-events-none">
            <DiscoveryCardView card={next} />
          </div>
        )}

        <AnimatePresence mode="popLayout">
          <motion.div
            key={current.userId}
            className="absolute inset-0 z-10 touch-none cursor-grab active:cursor-grabbing"
            style={{ x, y, rotate }}
            drag={!busy && !exitDir}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.92}
            onDragEnd={onDragEnd}
            animate={exitAnimate}
            transition={exitDir ? { duration: 0.28, ease: "easeIn" } : { type: "spring", stiffness: 300, damping: 28 }}
            whileTap={{ cursor: "grabbing" }}
          >
            <DiscoveryCardView
              card={current}
              expanded={cardExpanded}
              onToggleExpand={() => setCardExpanded((v) => !v)}
            />

            <motion.div
              style={{ opacity: likeOpacity, scale: likeScale }}
              className="absolute top-10 left-6 z-30 border-[3px] border-emerald-400 text-emerald-400 font-black text-3xl px-3 py-1 rounded-lg rotate-[-14deg] tracking-wider pointer-events-none"
            >
              LIKE
            </motion.div>
            <motion.div
              style={{ opacity: passOpacity, scale: passScale }}
              className="absolute top-10 right-6 z-30 border-[3px] border-rose-400 text-rose-400 font-black text-3xl px-3 py-1 rounded-lg rotate-[14deg] tracking-wider pointer-events-none"
            >
              NOPE
            </motion.div>
            <motion.div
              style={{ opacity: cheerOpacity }}
              className="absolute top-[28%] left-1/2 -translate-x-1/2 z-30 border-[3px] border-sky-400 text-sky-300 font-black text-2xl px-3 py-1 rounded-lg tracking-wider pointer-events-none"
            >
              SUPER
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {actError && <p className="text-center text-sm text-rose-400 mt-3 mb-1">{actError}</p>}

      {/* Tinder action row */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mt-5">
        <motion.button
          type="button"
          disabled={busy || !lastPassed}
          onClick={() => void rewind()}
          whileTap={pressTap}
          className={cn(
            "h-12 w-12 rounded-full border-2 flex items-center justify-center shadow-lg transition-opacity",
            "border-amber-500/50 bg-black/50",
            lastPassed ? "opacity-100 hover:bg-amber-500/15" : "opacity-35 cursor-not-allowed"
          )}
          aria-label="되돌리기"
        >
          <RotateCcw className="h-5 w-5 text-amber-400" />
        </motion.button>

        <motion.button
          type="button"
          disabled={busy}
          onClick={() => void act("PASS")}
          whileTap={pressTap}
          whileHover={{ scale: 1.06 }}
          className="h-[3.75rem] w-[3.75rem] rounded-full border-[3px] border-rose-400/70 bg-black/50 flex items-center justify-center shadow-lg hover:bg-rose-500/15 discover-action-btn discover-action-pass"
          aria-label="패스"
        >
          <X className="h-8 w-8 text-rose-400 stroke-[2.5]" />
        </motion.button>

        <motion.button
          type="button"
          disabled={busy}
          onClick={() => void act("CHEER")}
          whileTap={pressTap}
          whileHover={{ scale: 1.08 }}
          className="h-12 w-12 rounded-full border-[3px] border-sky-400/70 bg-black/50 flex items-center justify-center shadow-lg hover:bg-sky-500/15 discover-action-btn discover-action-cheer"
          aria-label="슈퍼 라이크"
        >
          <Star className="h-6 w-6 text-sky-400 fill-sky-400/40" />
        </motion.button>

        <motion.button
          type="button"
          disabled={busy}
          onClick={() => void act("LIKE")}
          whileTap={pressTap}
          whileHover={{ scale: 1.06 }}
          className="h-[3.75rem] w-[3.75rem] rounded-full border-[3px] border-emerald-400/70 bg-black/50 flex items-center justify-center shadow-lg hover:bg-emerald-500/15 discover-action-btn discover-action-like"
          aria-label="좋아요"
        >
          <Heart className="h-8 w-8 text-emerald-400 fill-emerald-400/50" />
        </motion.button>
      </div>

      <p className="text-center text-[11px] text-white/35 mt-4">
        ← 패스 · → 좋아요 · ↑ 슈퍼 · 버튼으로도 가능
      </p>
    </div>
  );
}
