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
import { emptySlotHint, wrapIndex } from "@/lib/live-bead-slots";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import { LiveAdultWatermark, isLiveAdultChannel } from "@/components/live/live-adult-watermark";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const OFF_AIR_TV_SRC = "/images/live/off-air-tv.png";
const SPRING_STIFFNESS = 180;
const SPRING_DAMPING = 22;
const HERO_RAIL_MIN_SLOTS = 8;

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

function visibleRadiusForWidth(w: number): number {
  if (w < 480) return 0.95;
  if (w < 768) return 1.1;
  return 1.25;
}

type Props = {
  channels: LiveHubChannel[];
  hosts: LiveHubHost[];
  className?: string;
};

/** Horizontal infinite bead rail — default slide is off-air TV, then live rows. */
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
  const [spacing, setSpacing] = useState(320);
  const [visibleRadius, setVisibleRadius] = useState(1.15);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.max(el.clientWidth, 1);
      setSpacing(Math.max(240, Math.min(w * 0.78, 520)));
      setVisibleRadius(visibleRadiusForWidth(w));
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
      e.preventDefault();
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      indexRef.current += dx / spacing;
      velocityRef.current = dx / spacing;
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
  visibleRadius,
  active,
  host,
}: {
  slot: LiveHeroRailSlot;
  baseIndex: number;
  length: number;
  index: number;
  spacing: number;
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
    abs < 1 ? 1 - abs * 0.08 : abs < 2 ? 0.92 - (abs - 1) * 0.06 : 0.86 - (abs - 2) * 0.05;
  const opacity =
    abs < 1
      ? 1 - abs * 0.12
      : abs < 2
        ? 0.88 - (abs - 1) * 0.2
        : Math.max(0.28, 0.68 - (abs - 2) * 0.32);
  const translateX = delta * spacing;

  return (
    <div
      role="listitem"
      className="absolute left-1/2 top-1/2 w-[min(92vw,720px)] max-w-[720px] will-change-transform"
      style={{
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
    return <EmptyHeroCard tone={slot.tone} focused={active} />;
  }
  return <LiveHeroCard channel={slot.channel} host={host} />;
}

function OffAirHeroCard({ focused }: { focused: boolean }) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        "relative w-full aspect-[16/10] overflow-hidden rounded-2xl",
        focused && "ring-1 ring-white/10"
      )}
    >
      <Image
        src={OFF_AIR_TV_SRC}
        alt={t("live.noBroadcastEmptyHub")}
        fill
        priority
        className="object-contain object-center"
        sizes="(max-width: 720px) 92vw, 720px"
      />
    </div>
  );
}

function EmptyHeroCard({ tone, focused }: { tone: number; focused: boolean }) {
  return (
    <div
      className="w-full aspect-[16/10] rounded-2xl border border-white/8 bg-neutral-800/70 flex items-center justify-center px-4"
      aria-hidden={!focused}
    >
      <p className="text-sm font-semibold text-white/35">
        {focused ? "현재 라이브 방송이 없습니다" : emptySlotHint(tone)}
      </p>
    </div>
  );
}

function LiveHeroCard({ channel, host }: { channel: LiveHubChannel; host?: LiveHubHost }) {
  const { locale } = useLocale();
  const thumb = channel.thumbnailUrl ?? host?.image;

  return (
    <Link
      href={`/voice/${channel.id}`}
      prefetch={false}
      className="block w-full rounded-2xl overflow-hidden border border-white/15 bg-black shadow-[0_0_24px_rgba(26,106,255,0.25)]"
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
