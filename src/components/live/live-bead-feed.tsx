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
import { Eye, Radio, User } from "lucide-react";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import {
  buildLiveBeadSlots,
  emptySlotHint,
  wrapIndex,
  type LiveBeadSlot,
} from "@/lib/live-bead-slots";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import { LiveAdultWatermark, isLiveAdultChannel } from "@/components/live/live-adult-watermark";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const SPRING_STIFFNESS = 180;
const SPRING_DAMPING = 22;

type Props = {
  channels: LiveHubChannel[];
  hosts: LiveHubHost[];
  className?: string;
};

/**
 * Vertical infinite bead carousel — mirrors mobile LiveBeadFeed (wheel + drag, wraparound).
 */
export function LiveBeadFeed({ channels, hosts, className }: Props) {
  const hostMap = useMemo(
    () => Object.fromEntries(hosts.map((h) => [h.id, h])),
    [hosts]
  );
  const sorted = useMemo(
    () => [...channels].sort((a, b) => b.viewerCount - a.viewerCount),
    [channels]
  );
  const slots = useMemo(() => buildLiveBeadSlots(sorted), [sorted]);
  const length = slots.length;

  const indexRef = useRef(0);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [spacing, setSpacing] = useState(220);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      // Card ~16:9 of width + meta; spacing ~72% of card height like mobile.
      const cardH = Math.min(el.clientWidth * (9 / 16) + 52, h * 0.55);
      setSpacing(Math.max(140, cardH * 0.72));
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
    // Spring toward nearest slot; add residual velocity decay.
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

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      indexRef.current += e.deltaY / spacing;
      velocityRef.current = e.deltaY / spacing;
      setIndex(indexRef.current);
      ensureRaf();
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [ensureRaf, spacing]);

  const onPointerDown = (e: ReactPointerEvent) => {
    draggingRef.current = true;
    lastYRef.current = e.clientY;
    lastTRef.current = performance.now();
    velocityRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dy = e.clientY - lastYRef.current;
    const dt = Math.max(8, now - lastTRef.current);
    // Drag up → index increases.
    const dSlots = -dy / spacing;
    indexRef.current += dSlots;
    velocityRef.current = (dSlots / dt) * 1000;
    lastYRef.current = e.clientY;
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
        "relative w-full sm:w-[300px] lg:w-[340px] shrink-0 h-[min(70dvh,640px)] lg:h-full min-h-[420px]",
        "overflow-hidden touch-none select-none",
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="list"
      aria-label="Live bead feed"
    >
      {slots.map((slot, baseIndex) => (
        <BeadLayer
          key={slot.key}
          slot={slot}
          baseIndex={baseIndex}
          length={length}
          index={index}
          spacing={spacing}
          active={baseIndex === activeIdx}
          host={slot.kind === "live" ? hostMap[slot.channel.createdBy] : undefined}
        />
      ))}
    </div>
  );
}

function BeadLayer({
  slot,
  baseIndex,
  length,
  index,
  spacing,
  active,
  host,
}: {
  slot: LiveBeadSlot;
  baseIndex: number;
  length: number;
  index: number;
  spacing: number;
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
  if (abs > 2.6) return null;

  const scale = abs < 1 ? 1 - abs * 0.1 : abs < 2 ? 0.9 - (abs - 1) * 0.1 : 0.8 - (abs - 2) * 0.08;
  const opacity = abs < 1 ? 1 - abs * 0.22 : abs < 2 ? 0.78 - (abs - 1) * 0.36 : Math.max(0, 0.42 - (abs - 2) * 0.7);
  const translateY = delta * spacing;

  return (
    <div
      role="listitem"
      className="absolute left-1/2 top-1/2 w-[92%] max-w-[320px] will-change-transform"
      style={{
        opacity,
        zIndex: Math.round(100 - abs * 10),
        transform: `translate(-50%, calc(-50% + ${translateY}px)) scale(${scale})`,
        pointerEvents: active ? "auto" : "none",
      }}
    >
      <BeadCard slot={slot} active={active} host={host} />
    </div>
  );
}

function BeadCard({
  slot,
  active,
  host,
}: {
  slot: LiveBeadSlot;
  active: boolean;
  host?: LiveHubHost;
}) {
  if (slot.kind === "empty") {
    return <EmptyBead tone={slot.tone} focused={active} />;
  }
  return <LiveBead channel={slot.channel} host={host} />;
}

function EmptyBead({ tone, focused }: { tone: number; focused: boolean }) {
  const tint = 8 + (tone % 8) * 2;
  return (
    <div
      className="aspect-video w-full rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center px-5"
      style={{ backgroundColor: `rgb(${tint},${tint + 2},${tint + 8})` }}
    >
      <div className="relative flex flex-col items-center gap-1.5 text-center">
        <div
          className="absolute w-[120px] h-[120px] rounded-full bg-white/[0.06] -translate-y-2"
          style={{ opacity: 0.18 + (tone % 5) * 0.04 }}
        />
        {focused ? (
          <>
            <p className="relative text-[15px] font-bold text-white/90">
              현재 라이브 방송이 없습니다
            </p>
            <p className="relative text-xs font-medium text-white/45 leading-snug">
              새로운 방송이 시작되면 이곳에 표시됩니다
            </p>
          </>
        ) : (
          <p className="relative text-xs font-semibold text-white/30 tracking-wide">
            {emptySlotHint(tone)}
          </p>
        )}
      </div>
    </div>
  );
}

function LiveBead({ channel, host }: { channel: LiveHubChannel; host?: LiveHubHost }) {
  const { locale } = useLocale();
  const thumb = channel.thumbnailUrl ?? host?.image;

  return (
    <Link
      href={`/voice/${channel.id}`}
      prefetch={false}
      className="block w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0A0C10] shadow-lg"
    >
      <div className="relative aspect-video bg-black overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--folk-cobalt)/0.16)]">
            <Radio className="h-9 w-9 text-folk-terracotta/40" />
          </div>
        )}
        {isLiveAdultChannel(channel) ? <LiveAdultWatermark /> : null}
        <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
          <Eye className="h-3 w-3" />
          {channel.viewerCount}
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0F1420]">
        <div className="h-7 w-7 shrink-0 rounded-full overflow-hidden bg-muted">
          {host?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={host.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <User className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-folk-terracotta truncate">
            @{host?.username ?? "host"}
          </p>
          <p className="text-[13px] font-bold text-white/90 truncate">{channel.name}</p>
        </div>
        <span className="text-[11px] font-semibold text-white/40 shrink-0">
          {localizedLiveCategoryLabel(channel.category, locale)}
        </span>
      </div>
    </Link>
  );
}
