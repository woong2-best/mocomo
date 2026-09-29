"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { Eye, Radio } from "lucide-react";
import { LIVE_HERO_CARD_ASPECT, OFF_AIR_TV_SRC } from "@/components/live/live-off-air-tv-asset";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import { wrapIndex } from "@/lib/live-bead-slots";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import { LiveAdultWatermark, isLiveAdultChannel } from "@/components/live/live-adult-watermark";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const SPRING_STIFFNESS = 180;
const SPRING_DAMPING = 22;
const HERO_RAIL_MIN_SLOTS = 12;
const VISIBLE_COUNT = 5;

export type LiveHeroRailSlot =
  | { kind: "off-air"; key: "off-air" }
  | { kind: "live"; key: string; channel: LiveHubChannel }
  | { kind: "empty"; key: string; tone: number };

/**
 * No live → [off-air, empty…] (center = TV).
 * With live → [live… by viewers desc, off-air, empty…] (center = top live).
 */
export function buildHeroRailSlots(channels: LiveHubChannel[]): LiveHeroRailSlot[] {
  const sorted = [...channels].sort((a, b) => b.viewerCount - a.viewerCount);
  const slots: LiveHeroRailSlot[] = [];

  if (sorted.length === 0) {
    slots.push({ kind: "off-air", key: "off-air" });
  } else {
    for (const channel of sorted) {
      slots.push({ kind: "live", key: `live-${channel.id}`, channel });
    }
    slots.push({ kind: "off-air", key: "off-air" });
  }

  let tone = 0;
  while (slots.length < HERO_RAIL_MIN_SLOTS) {
    slots.push({ kind: "empty", key: `empty-${tone}`, tone });
    tone += 1;
  }
  return slots;
}

function measureHeroRail(width: number): { cardWidth: number; spacing: number; visibleRadius: number } {
  const w = Math.max(width, 1);
  const cardWidth = Math.round(Math.min(Math.max(w * 0.34, 240), 400));
  return {
    cardWidth,
    spacing: Math.round(cardWidth * 0.54),
    visibleRadius: (VISIBLE_COUNT - 1) / 2 + 0.5,
  };
}

export function coverFlowMotion(delta: number): {
  scale: number;
  opacity: number;
  translateX: number;
  translateZ: number;
  rotateY: number;
  zIndex: number;
} {
  const abs = Math.abs(delta);
  const sign = delta > 0 ? 1 : delta < 0 ? -1 : 0;

  let scale = 1;
  if (abs >= 0.02) {
    if (abs < 1) scale = 1 - abs * 0.26;
    else if (abs < 2) scale = 0.74 - (abs - 1) * 0.14;
    else scale = 0.6 - (abs - 2) * 0.08;
  }

  let opacity = 1;
  if (abs >= 0.02) {
    if (abs < 1) opacity = 0.88 - abs * 0.28;
    else if (abs < 2) opacity = 0.6 - (abs - 1) * 0.18;
    else opacity = Math.max(0.28, 0.42 - (abs - 2) * 0.12);
  }

  const translateZ = abs < 0.02 ? 220 : -abs * 130;
  const rotateY = sign * (abs < 0.02 ? 0 : Math.min(52, 28 + abs * 18));

  return {
    scale: Math.max(0.48, scale),
    opacity,
    translateX: delta,
    translateZ,
    rotateY,
    zIndex: Math.round(300 - abs * 55),
  };
}

type Props = {
  channels: LiveHubChannel[];
  hosts: LiveHubHost[];
  className?: string;
};

/** 3D Cover Flow — infinite drag/wheel + spring snap. */
export function LiveHubHeroRail({ channels, hosts, className }: Props) {
  const hostMap = useMemo(
    () => Object.fromEntries(hosts.map((h) => [h.id, h])),
    [hosts]
  );
  const slots = useMemo(() => buildHeroRailSlots(channels), [channels]);
  const length = slots.length;

  const indexRef = useRef(0);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastTRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const liveIdsKeyRef = useRef("");

  const [index, setIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(320);
  const [spacing, setSpacing] = useState(200);
  const [visibleRadius, setVisibleRadius] = useState(2.5);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const next = measureHeroRail(el.clientWidth);
      setCardWidth(next.cardWidth);
      setSpacing(next.spacing);
      setVisibleRadius(next.visibleRadius);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tick = useCallback(() => {
    if (draggingRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const target = Math.round(indexRef.current);
    const delta = target - indexRef.current;
    velocityRef.current += delta * (SPRING_STIFFNESS / 60);
    velocityRef.current *= 1 - SPRING_DAMPING / 60;
    indexRef.current += velocityRef.current / 60;

    if (Math.abs(delta) < 0.001 && Math.abs(velocityRef.current) < 0.01) {
      indexRef.current = target;
      velocityRef.current = 0;
      setIndex(target);
      rafRef.current = null;
      return;
    }
    setIndex(indexRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const ensureRaf = useCallback(() => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  /** New/removed live → snap center to slot 0 (top live or off-air). */
  useEffect(() => {
    const key = channels
      .map((c) => c.id)
      .sort()
      .join("|");
    if (key === liveIdsKeyRef.current) return;
    liveIdsKeyRef.current = key;
    indexRef.current = 0;
    velocityRef.current = 0;
    setIndex(0);
    ensureRaf();
  }, [channels, ensureRaf]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(raw) < 1) return;
      e.preventDefault();
      indexRef.current += raw / spacing;
      velocityRef.current = raw / spacing;
      setIndex(indexRef.current);
      ensureRaf();
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [ensureRaf, spacing]);

  const onPointerDown = (e: ReactPointerEvent) => {
    draggingRef.current = true;
    lastXRef.current = e.clientX;
    lastTRef.current = performance.now();
    velocityRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dx = e.clientX - lastXRef.current;
    const dt = Math.max(8, now - lastTRef.current);
    const dSlots = -dx / spacing;
    indexRef.current += dSlots;
    velocityRef.current = (dSlots / dt) * 1000;
    lastXRef.current = e.clientX;
    lastTRef.current = now;
    setIndex(indexRef.current);
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    ensureRaf();
  };

  const activeIdx = wrapIndex(Math.round(index), length);

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative isolate w-full shrink-0 overflow-hidden touch-none select-none bg-black",
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="list"
      aria-label="Live hero rail"
      style={{ perspective: "2000px", perspectiveOrigin: "50% 42%" }}
    >
      <div className="relative h-full w-full" style={{ transformStyle: "preserve-3d" }}>
        {slots.map((slot, baseIndex) => (
          <HeroRailLayer
            key={slot.key}
            slot={slot}
            baseIndex={baseIndex}
            length={length}
            index={index}
            spacing={spacing}
            cardWidth={cardWidth}
            visibleRadius={visibleRadius}
            active={baseIndex === activeIdx}
            host={slot.kind === "live" ? hostMap[slot.channel.createdBy] : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function HeroRailLayer({
  slot,
  baseIndex,
  length,
  index,
  spacing,
  cardWidth,
  visibleRadius,
  active,
  host,
}: {
  slot: LiveHeroRailSlot;
  baseIndex: number;
  length: number;
  index: number;
  spacing: number;
  cardWidth: number;
  visibleRadius: number;
  active: boolean;
  host?: LiveHubHost;
}) {
  let delta = baseIndex - index;
  if (length > 0) {
    const half = length / 2;
    while (delta > half) delta -= length;
    while (delta < -half) delta += length;
  }
  const abs = Math.abs(delta);
  if (abs > visibleRadius) return null;

  const motion = coverFlowMotion(delta);
  const translateX = motion.translateX * spacing;

  return (
    <div
      role="listitem"
      className="absolute left-1/2 top-1/2 will-change-transform"
      style={{
        width: cardWidth,
        opacity: motion.opacity,
        zIndex: motion.zIndex,
        transform: `translate3d(calc(-50% + ${translateX}px), -50%, ${motion.translateZ}px) rotateY(${motion.rotateY}deg) scale(${motion.scale})`,
        transformStyle: "preserve-3d",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      <HeroRailCard slot={slot} active={active} host={host} />
    </div>
  );
}

function HeroRailCard({
  slot,
  active,
  host,
}: {
  slot: LiveHeroRailSlot;
  active: boolean;
  host?: LiveHubHost;
}) {
  if (slot.kind === "off-air") {
    return <OffAirHeroCard focused={active} />;
  }
  if (slot.kind === "empty") {
    return <EmptyHeroCard tone={slot.tone} />;
  }
  return <LiveHeroCard channel={slot.channel} host={host} />;
}

function OffAirHeroCard({ focused }: { focused: boolean }) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-black shadow-[0_24px_48px_rgba(0,0,0,0.65)]",
        LIVE_HERO_CARD_ASPECT
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={OFF_AIR_TV_SRC}
        alt=""
        className="absolute inset-0 h-full w-full object-contain object-center"
        decoding="async"
        draggable={false}
      />
      {focused ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 p-3">
          <p className="text-center text-xs font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-sm">
            {t("live.noBroadcastEmptyHub")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function EmptyHeroCard({ tone }: { tone: number }) {
  const shade = 12 + (tone % 6) * 3;
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-white/[0.06] bg-[#0c0c0f]",
        LIVE_HERO_CARD_ASPECT
      )}
      style={{ backgroundColor: `rgb(${shade},${shade},${shade + 4})` }}
      aria-hidden
    />
  );
}

function LiveHeroCard({ channel, host }: { channel: LiveHubChannel; host?: LiveHubHost }) {
  const { locale } = useLocale();
  const thumb = channel.thumbnailUrl ?? host?.image;

  return (
    <Link
      href={`/voice/${channel.id}`}
      prefetch={false}
      className={cn(
        "block w-full overflow-hidden rounded-xl border border-white/12 bg-black shadow-[0_24px_48px_rgba(0,0,0,0.55)]",
        LIVE_HERO_CARD_ASPECT
      )}
    >
      <div className="relative h-full w-full bg-black">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--folk-cobalt)/0.2)]">
            <Radio className="h-12 w-12 text-folk-terracotta/45" />
          </div>
        )}
        {isLiveAdultChannel(channel) ? <LiveAdultWatermark /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/15" />
        <span className="live-badge absolute top-2.5 left-2.5 !bg-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
        <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-0.5">
          {host ? (
            <p className="text-xs font-bold text-white truncate sm:text-sm">@{host.username}</p>
          ) : null}
          <p className="text-sm font-black text-white line-clamp-2 sm:text-base">{channel.name}</p>
          <span className="inline-flex text-[10px] font-semibold text-white/75 rounded-md bg-white/10 px-2 py-0.5">
            {localizedLiveCategoryLabel(channel.category, locale)}
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
          <Eye className="h-3 w-3" />
          {channel.viewerCount}
        </div>
      </div>
    </Link>
  );
}
