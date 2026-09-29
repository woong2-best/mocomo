"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Radio } from "lucide-react";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import { wrapIndex } from "@/lib/live-bead-slots";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import { LiveAdultWatermark, isLiveAdultChannel } from "@/components/live/live-adult-watermark";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const OFF_AIR_TV_SRC = "/images/live/off-air-tv.png";
/** Same spring as the vertical bead feed (`live-bead-feed.tsx`). */
const SPRING_STIFFNESS = 180;
const SPRING_DAMPING = 22;
const HERO_RAIL_MIN_SLOTS = 8;
/** Always left peek + center + right peek, like the vertical 3-bead stage. */
const VISIBLE_COUNT = 3;

export type LiveHeroRailSlot =
  | { kind: "off-air"; key: "off-air" }
  | { kind: "live"; key: string; channel: LiveHubChannel }
  | { kind: "empty"; key: string; tone: number };

function buildHeroRailSlots(channels: LiveHubChannel[]): LiveHeroRailSlot[] {
  const sorted = [...channels].sort((a, b) => b.viewerCount - a.viewerCount);
  const slots: LiveHeroRailSlot[] = [{ kind: "off-air", key: "off-air" }];
  for (const channel of sorted) {
    slots.push({ kind: "live", key: `live-${channel.id}`, channel });
  }
  let tone = 0;
  while (slots.length < HERO_RAIL_MIN_SLOTS) {
    slots.push({ kind: "empty", key: `empty-${tone}`, tone });
    tone += 1;
  }
  return slots;
}

/** Large center TV; neighbors tuck behind it and peek at the sides. */
function measureHeroRail(width: number): { cardWidth: number; spacing: number; visibleRadius: number } {
  const w = Math.max(width, 1);
  const cardWidth = Math.round(Math.min(Math.max(w * 0.52, 340), 760));
  return {
    cardWidth,
    spacing: Math.round(cardWidth * 0.68),
    visibleRadius: (VISIBLE_COUNT - 1) / 2 + 0.2,
  };
}

type Props = {
  channels: LiveHubChannel[];
  hosts: LiveHubHost[];
  className?: string;
};

/** Horizontal port of `LiveBeadFeed`: wrap forever, spring snap, drag + wheel. */
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
  const [index, setIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(420);
  const [spacing, setSpacing] = useState(520);
  const [visibleRadius, setVisibleRadius] = useState(1.2);

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

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      indexRef.current += e.deltaX / spacing;
      velocityRef.current = e.deltaX / spacing;
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
        "relative w-full min-h-0 flex-1 overflow-hidden touch-none select-none bg-black",
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="list"
      aria-label="Live hero rail"
    >
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

  const scale =
    abs < 1 ? 1 - abs * 0.1 : abs < 2 ? 0.9 - (abs - 1) * 0.08 : 0.82 - (abs - 2) * 0.06;
  const opacity =
    abs < 1
      ? 1 - abs * 0.14
      : abs < 2
        ? 0.86 - (abs - 1) * 0.22
        : Math.max(0.25, 0.64 - (abs - 2) * 0.35);
  const translateX = delta * spacing;

  return (
    <div
      role="listitem"
      className="absolute left-1/2 top-1/2 will-change-transform"
      style={{
        width: cardWidth,
        opacity,
        zIndex: Math.round(100 - abs * 10),
        transform: `translate(calc(-50% + ${translateX}px), -50%) scale(${scale})`,
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
    <div className="relative w-full aspect-[16/10] overflow-hidden">
      <Image
        src={OFF_AIR_TV_SRC}
        alt={t("live.noBroadcastEmptyHub")}
        fill
        priority={focused}
        className="object-contain object-center"
        sizes="760px"
      />
    </div>
  );
}

function EmptyHeroCard({ tone }: { tone: number }) {
  const shade = 22 + (tone % 5) * 4;
  return (
    <div
      className="w-full aspect-[16/10] rounded-xl"
      style={{ backgroundColor: `rgb(${shade},${shade},${shade + 2})` }}
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
      className="block w-full rounded-xl overflow-hidden border border-white/15 bg-black"
    >
      <div className="relative aspect-[16/10] bg-black overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--folk-cobalt)/0.2)]">
            <Radio className="h-12 w-12 text-folk-terracotta/45" />
          </div>
        )}
        {isLiveAdultChannel(channel) ? <LiveAdultWatermark /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
        <span className="live-badge absolute top-3 left-3 !bg-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
        <div className="absolute bottom-3 left-3 right-3 space-y-1">
          {host ? (
            <p className="text-sm font-bold text-white truncate">@{host.username}</p>
          ) : null}
          <p className="text-base font-black text-white line-clamp-2">{channel.name}</p>
          <span className="inline-flex text-[10px] font-semibold text-white/75 rounded-md bg-white/10 px-2 py-0.5">
            {localizedLiveCategoryLabel(channel.category, locale)}
          </span>
        </div>
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white tabular-nums">
          <Eye className="h-3.5 w-3.5" />
          {channel.viewerCount}
        </div>
      </div>
    </Link>
  );
}
