"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Hammer, Music2, X } from "lucide-react";
import type { InstrumentKind } from "@/lib/apt/bondee/instruments/types";
import { notesForLayout, midiLabel } from "@/lib/apt/bondee/instruments/types";
import {
  INSTRUMENT_SPECS,
  isDiyCrafted,
  requiresDiy,
  specForInstrument,
} from "@/lib/apt/bondee/instruments/architecture";
import { playInstrumentNote, unlockInstrumentAudio } from "@/lib/apt/bondee/instruments/audio-engine";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  kind: InstrumentKind | null;
  crafted?: Partial<Record<InstrumentKind, boolean>>;
  onClose: () => void;
  onPlayingChange: (playing: boolean) => void;
  onCraft: (kind: InstrumentKind) => void;
};

export function InstrumentPlayPanel({
  open,
  kind,
  crafted,
  onClose,
  onPlayingChange,
  onCraft,
}: Props) {
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const [crafting, setCrafting] = useState(false);
  const [tab, setTab] = useState<"play" | "craft">("play");

  const spec = kind ? specForInstrument(kind) : null;
  const craftedOk = kind ? isDiyCrafted(kind, crafted) : false;
  const notes = useMemo(
    () => (spec ? notesForLayout(spec.layout, spec.baseMidi) : []),
    [spec]
  );

  useEffect(() => {
    if (!open) {
      setActiveKeys(new Set());
      onPlayingChange(false);
      setCrafting(false);
      setTab("play");
    }
  }, [open, onPlayingChange]);

  useEffect(() => {
    if (open && kind && requiresDiy(kind) && !craftedOk) setTab("craft");
  }, [open, kind, craftedOk]);

  const playNote = useCallback(
    async (index: number, midi: number) => {
      if (!kind || !craftedOk) return;
      await unlockInstrumentAudio();
      playInstrumentNote(kind, midi, index);
      setActiveKeys((prev) => new Set(prev).add(index));
      onPlayingChange(true);
      setTimeout(() => {
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete(index);
          if (next.size === 0) onPlayingChange(false);
          return next;
        });
      }, 180);
    },
    [kind, craftedOk, onPlayingChange]
  );

  const handleCraft = () => {
    if (!kind) return;
    setCrafting(true);
    setTimeout(() => {
      onCraft(kind);
      setCrafting(false);
      setTab("play");
    }, 1800);
  };

  if (!open || !kind || !spec) return null;

  const layout = spec.layout;
  const isBlackKey = (i: number) => layout.family === "keyboard" && [1, 3, 6, 8, 10].includes(i % 12);

  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-24 z-30 mx-auto max-w-md">
      <div className="rounded-2xl border-2 border-violet-200/90 bg-white/95 p-4 shadow-lg backdrop-blur-md">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-lg">
              {spec.emoji}
            </div>
            <div>
              <p className="text-sm font-bold text-folk-cobalt">{spec.label}</p>
              <p className="text-[10px] text-muted-foreground">E키로 연주 · 터치/클릭</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-neutral-100"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {spec.diy && (
          <div className="mb-3 flex gap-1 rounded-xl bg-violet-50/80 p-1">
            <button
              type="button"
              onClick={() => setTab("play")}
              disabled={!craftedOk}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[10px] font-bold transition-colors",
                tab === "play" ? "bg-white shadow-sm text-violet-700" : "text-muted-foreground",
                !craftedOk && "opacity-50"
              )}
            >
              <Music2 className="mr-1 inline h-3 w-3" />
              연주
            </button>
            <button
              type="button"
              onClick={() => setTab("craft")}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[10px] font-bold transition-colors",
                tab === "craft" ? "bg-white shadow-sm text-amber-700" : "text-muted-foreground"
              )}
            >
              <Hammer className="mr-1 inline h-3 w-3" />
              DIY 제작
            </button>
          </div>
        )}

        {tab === "craft" && spec.diy ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{spec.diy.hint}</p>
            <ul className="space-y-1.5">
              {spec.diy.materials.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs"
                >
                  <span className="font-medium">{m.label}</span>
                  <span className="font-bold text-amber-700">×{m.qty}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleCraft}
              disabled={crafting || craftedOk}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white transition-colors",
                craftedOk ? "bg-green-500" : crafting ? "bg-amber-400" : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              <Hammer className="h-4 w-4" />
              {craftedOk ? "제작 완료!" : crafting ? "제작 중…" : spec.diy.craftLabel}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {layout.family === "percussion_kit" && (
              <div className="grid grid-cols-4 gap-1.5">
                {layout.pads.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onPointerDown={() => void playNote(i, notes[i] ?? 36 + i)}
                    className={cn(
                      "rounded-xl border-2 py-3 text-[10px] font-bold transition-all active:scale-95",
                      activeKeys.has(i)
                        ? "border-violet-400 bg-violet-200 text-violet-900"
                        : "border-neutral-200 bg-neutral-50 hover:bg-violet-50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {layout.family === "keyboard" && (
              <div className="flex gap-0.5 overflow-x-auto pb-1">
                {notes.map((midi, i) => (
                  <button
                    key={i}
                    type="button"
                    onPointerDown={() => void playNote(i, midi)}
                    className={cn(
                      "shrink-0 rounded-b-lg border transition-all active:scale-y-95",
                      isBlackKey(i)
                        ? cn(
                            "h-16 w-7 -mx-1 z-10 border-neutral-700 text-[8px] text-white",
                            activeKeys.has(i) ? "bg-violet-600" : "bg-neutral-800 hover:bg-neutral-700"
                          )
                        : cn(
                            "h-24 w-9 border-neutral-200 text-[8px]",
                            activeKeys.has(i)
                              ? "bg-violet-200 border-violet-400"
                              : "bg-white hover:bg-violet-50"
                          )
                    )}
                  >
                    {midiLabel(midi)}
                  </button>
                ))}
              </div>
            )}

            {(layout.family === "string_fret" ||
              layout.family === "bowed" ||
              layout.family === "harp" ||
              layout.family === "mallet" ||
              layout.family === "timpani" ||
              layout.family === "wind_reed" ||
              layout.family === "wind_brass" ||
              layout.family === "pan_flute" ||
              layout.family === "ocarina") && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {notes.map((midi, i) => (
                  <button
                    key={i}
                    type="button"
                    onPointerDown={() => void playNote(i, midi)}
                    className={cn(
                      "min-w-[2.4rem] rounded-xl border-2 px-2 py-2.5 text-[10px] font-bold transition-all active:scale-95",
                      activeKeys.has(i)
                        ? "border-violet-400 bg-violet-200 text-violet-900"
                        : "border-neutral-200 bg-neutral-50 hover:bg-violet-50"
                    )}
                  >
                    {layout.family === "pan_flute" ? `${i + 1}관` : midiLabel(midi)}
                  </button>
                ))}
              </div>
            )}

            <p className="text-center text-[9px] text-muted-foreground">
              {spec.playPose === "sit" ? "앉아서" : "서서"} 연주 · Web Audio 실시간 합성
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export { INSTRUMENT_SPECS };
