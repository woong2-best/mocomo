"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Power, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { isVoiceBroadcastMode } from "@/lib/live-voice-broadcast";

type ConsoleModePhase = "off" | "entering" | "active" | "exiting";

const LiveViewerPlayer = dynamic(
  () => import("@/components/live/live-viewer-player").then((m) => m.LiveViewerPlayer),
  { ssr: false }
);

type LiveChannel = {
  id: string;
  name: string;
  hostUserId: string;
  hostUsername: string | null;
  viewerCount: number;
  broadcastMode?: string | null;
};

type Props = {
  phase: ConsoleModePhase;
  blend: number;
  onPowerOff: () => void;
};

export function AptLiveTvPanel({ phase, blend, onPowerOff }: Props) {
  const visible = phase === "entering" || phase === "active" || phase === "exiting";
  const screenOpacity = phase === "active" ? 1 : Math.min(1, Math.max(0, blend));
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [selected, setSelected] = useState<LiveChannel | null>(null);
  const watchRewardGrantedRef = useRef(false);

  useEffect(() => {
    if (!visible || !selected) return;
    const channelId = selected.id;
    const started = Date.now();
    watchRewardGrantedRef.current = false;

    const requestReward = () => {
      if (watchRewardGrantedRef.current) return;
      const elapsedMin = Math.floor((Date.now() - started) / 60_000);
      if (elapsedMin < 1) return;
      watchRewardGrantedRef.current = true;
      void fetch("/api/apt/live-watch-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, minutes: 1 }),
      })
        .then(async (r) => {
          if (!r.ok) return;
          const data = (await r.json()) as { granted?: number };
          if (data.granted && data.granted > 0) {
            window.dispatchEvent(
              new CustomEvent("apt-game-toast", {
                detail: {
                  message: `TV 시청 보상 +${data.granted.toLocaleString()}G`,
                  kind: "gold",
                },
              })
            );
          }
        })
        .catch(() => undefined);
    };

    const timer = window.setInterval(requestReward, 15_000);
    requestReward();
    return () => window.clearInterval(timer);
  }, [visible, selected?.id]);

  useEffect(() => {
    if (!visible) return;
    void fetch("/api/apt/live-channels")
      .then((r) => r.json())
      .then((data: { channels?: LiveChannel[]; featured?: LiveChannel | null }) => {
        setChannels(data.channels ?? []);
        setSelected(data.featured ?? data.channels?.[0] ?? null);
      })
      .catch(() => setChannels([]));
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[185] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "exiting" ? 1 - blend : Math.min(1, blend * 1.4) }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70"
            style={{ opacity: Math.min(1, blend * 1.2) }}
          />

          <div className="absolute inset-0 flex items-center justify-center px-4 py-16 pointer-events-none">
            <motion.div
              className="relative w-full max-w-3xl pointer-events-auto"
              initial={{ scale: 0.82, y: 24 }}
              animate={{
                scale: phase === "active" ? 1 : 0.88 + blend * 0.12,
                y: phase === "active" ? 0 : 24 * (1 - blend),
              }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <div className="relative rounded-[1.25rem] border-[10px] border-neutral-900 bg-neutral-950 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
                <div
                  className={cn(
                    "relative m-3 overflow-hidden rounded-lg bg-black ring-1 ring-red-400/30",
                    "aspect-video"
                  )}
                  style={{
                    opacity: screenOpacity,
                    boxShadow: phase === "active" ? "0 0 48px rgba(248,113,113,0.35)" : "none",
                  }}
                >
                  {phase === "active" && selected && (
                    isVoiceBroadcastMode(selected.broadcastMode) ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-violet-950 to-black px-6">
                        <LiveViewerPlayer
                          channelId={selected.id}
                          hostUserId={selected.hostUserId}
                          broadcastMode="VOICE"
                          isLiveOnAir
                          showOverlays={false}
                        />
                      </div>
                    ) : (
                      <LiveViewerPlayer
                        channelId={selected.id}
                        hostUserId={selected.hostUserId}
                        broadcastMode={selected.broadcastMode as "BROWSER" | "OBS" | undefined}
                        isLiveOnAir
                        showOverlays={false}
                      />
                    )
                  )}
                  {phase === "active" && !selected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a0a0a] to-[#111827] text-center px-6">
                      <Radio className="h-10 w-10 text-red-300/60 mb-3" />
                      <p className="text-sm font-bold text-white/80">현재 방송 중인 채널이 없습니다</p>
                      <p className="text-xs text-white/50 mt-1">이웃 방송이 시작되면 TV에 표시됩니다</p>
                      <p className="text-[10px] text-white/40 mt-2">TV 스탠드 가구 앞에서 상호작용</p>
                    </div>
                  )}
                  {phase !== "active" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a0a0a] to-[#111827]">
                      <div className="text-center space-y-2">
                        <div className="mx-auto h-10 w-10 rounded-full border-2 border-red-400/40 border-t-red-300 animate-spin" />
                        <p className="text-xs font-semibold text-red-200/80 tracking-wide">
                          {phase === "exiting" ? "TV 종료…" : "라이브 TV 켜는 중…"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {phase === "active" && channels.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto px-4 pb-2">
                    {channels.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setSelected(ch)}
                        className={cn(
                          "shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-colors",
                          selected?.id === ch.id
                            ? "border-red-400/60 bg-red-500/20 text-red-200"
                            : "border-white/15 text-white/60 hover:bg-white/10"
                        )}
                      >
                        {ch.hostUsername ?? ch.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between px-4 pb-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        phase === "active" && selected
                          ? "bg-red-400 shadow-[0_0_8px_#f87171] animate-pulse"
                          : "bg-amber-400"
                      )}
                    />
                    <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
                      Live TV
                      {selected && phase === "active" ? ` · ${selected.hostUsername ?? selected.name}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onPowerOff}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/60 px-3 py-1.5 text-[11px] font-bold text-red-300 hover:bg-red-900/60 transition-colors"
                  >
                    <Power className="h-3.5 w-3.5" />
                    끄기
                  </button>
                </div>
              </div>

              <p className="mt-3 text-center text-[10px] text-white/50 font-medium">
                소파/TV 앞에 앉아 실시간 라이브를 시청 중
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
