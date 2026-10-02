"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Download, Hammer, Music2, Radio, X } from "lucide-react";
import type { InstrumentKind } from "@/lib/apt/bondee/instruments/types";
import { notesForLayout, midiLabel } from "@/lib/apt/bondee/instruments/types";
import {
  INSTRUMENT_SPECS,
  isDiyCrafted,
  requiresDiy,
  specForInstrument,
} from "@/lib/apt/bondee/instruments/architecture";
import { playInstrumentNote, unlockInstrumentAudio } from "@/lib/apt/bondee/instruments/audio-engine";
import { InstrumentRecorder } from "@/lib/apt/bondee/instruments/instrument-recorder";
import { useWebMidiInput } from "@/lib/apt/bondee/instruments/midi-input";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  kind: InstrumentKind | null;
  crafted?: Partial<Record<InstrumentKind, boolean>>;
  onClose: () => void;
  onPlayingChange: (playing: boolean) => void;
  onCraft: (kind: InstrumentKind) => void;
  onNotePlayed?: (kind: InstrumentKind, midi: number, padIndex?: number) => void;
};

export function InstrumentPlayPanel({
  open,
  kind,
  crafted,
  onClose,
  onPlayingChange,
  onCraft,
  onNotePlayed,
}: Props) {
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const [crafting, setCrafting] = useState(false);
  const [tab, setTab] = useState<"play" | "craft">("play");
  const [recording, setRecording] = useState(false);
  const [recordedCount, setRecordedCount] = useState(0);
  const recorderRef = useRef(new InstrumentRecorder());

  const spec = kind ? specForInstrument(kind) : null;
  const craftedOk = kind ? isDiyCrafted(kind, crafted) : false;
  const notes = useMemo(
    () => (spec ? notesForLayout(spec.layout, spec.baseMidi) : []),
    [spec]
  );

  const playNote = useCallback(
    async (index: number, midi: number) => {
      if (!kind || !craftedOk) return;
      await unlockInstrumentAudio();
      playInstrumentNote(kind, midi, index);
      onNotePlayed?.(kind, midi, index);
      if (recorderRef.current.isRecording) {
        recorderRef.current.record(kind, midi, index);
        setRecordedCount(recorderRef.current.noteCount);
      }
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
    [kind, craftedOk, onPlayingChange, onNotePlayed]
  );

  const onMidiNote = useCallback(
    (midi: number, velocity: number) => {
      if (velocity <= 0 || !kind) return;
      const idx = notes.findIndex((n) => n === midi);
      void playNote(idx >= 0 ? idx : 0, midi);
    },
    [kind, notes, playNote]
  );

  const midi = useWebMidiInput(onMidiNote);

  useEffect(() => {
    if (!open) {
      setActiveKeys(new Set());
      onPlayingChange(false);
      setCrafting(false);
      setTab("play");
      setRecording(false);
      recorderRef.current.clear();
      setRecordedCount(0);
    }
  }, [open, onPlayingChange]);

  useEffect(() => {
    if (open && kind && requiresDiy(kind) && !craftedOk) setTab("craft");
  }, [open, kind, craftedOk]);

  const handleCraft = () => {
    if (!kind) return;
    setCrafting(true);
    setTimeout(() => {
      onCraft(kind);
      setCrafting(false);
      setTab("play");
    }, 1800);
  };

  const toggleRecord = () => {
    if (!kind) return;
    if (recording) {
      recorderRef.current.stop();
      setRecording(false);
    } else {
      recorderRef.current.start(kind);
      setRecording(true);
      setRecordedCount(0);
    }
  };

  const playbackRecording = () => {
    const notes = recorderRef.current.stop();
    setRecording(false);
    recorderRef.current.playback(notes, (k, midi, pad) => {
      playInstrumentNote(k, midi, pad);
      onPlayingChange(true);
    });
    setTimeout(() => onPlayingChange(false), (notes[notes.length - 1]?.t ?? 0) + 500);
  };

  const downloadRecording = () => {
    const blob = new Blob([recorderRef.current.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind ?? "instrument"}-recording.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open || !kind || !spec) return null;

  const layout = spec.layout;
  const isBlackKey = (i: number) => layout.family === "keyboard" && [1, 3, 6, 8, 10].includes(i % 12);

  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-24 z-30 mx-auto max-w-md">
      <div className="rounded-2xl border-2 border-violet-400/40 bg-black/80 p-4 shadow-xl backdrop-blur-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/25 text-lg">
              {spec.emoji}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{spec.label}</p>
              <p className="text-[10px] text-white/50">E · 터치 · MIDI · 합주 동기화</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/60 hover:bg-white/10"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void (midi.enabled ? midi.disable() : midi.enable())}
            className={cn(
              "rounded-lg border px-2 py-1 text-[9px] font-bold",
              midi.enabled
                ? "border-green-400/50 bg-green-500/20 text-green-200"
                : "border-white/15 text-white/60 hover:bg-white/10"
            )}
          >
            MIDI {midi.enabled ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={toggleRecord}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2 py-1 text-[9px] font-bold",
              recording
                ? "border-red-400/50 bg-red-500/20 text-red-200"
                : "border-white/15 text-white/60 hover:bg-white/10"
            )}
          >
            <Circle className={cn("h-2.5 w-2.5", recording && "fill-red-400 text-red-400")} />
            {recording ? `녹음 ${recordedCount}` : "녹음"}
          </button>
          {recordedCount > 0 && !recording && (
            <>
              <button
                type="button"
                onClick={playbackRecording}
                className="rounded-lg border border-white/15 px-2 py-1 text-[9px] font-bold text-white/70 hover:bg-white/10"
              >
                재생
              </button>
              <button
                type="button"
                onClick={downloadRecording}
                className="flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[9px] font-bold text-white/70 hover:bg-white/10"
              >
                <Download className="h-3 w-3" />
                저장
              </button>
            </>
          )}
        </div>

        {spec.diy && (
          <div className="mb-3 flex gap-1 rounded-xl bg-violet-500/10 p-1">
            <button
              type="button"
              onClick={() => setTab("play")}
              disabled={!craftedOk}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[10px] font-bold transition-colors",
                tab === "play" ? "bg-white/15 text-violet-200" : "text-white/50",
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
                tab === "craft" ? "bg-white/15 text-amber-200" : "text-white/50"
              )}
            >
              <Hammer className="mr-1 inline h-3 w-3" />
              DIY
            </button>
          </div>
        )}

        {tab === "craft" && spec.diy ? (
          <div className="space-y-3">
            <p className="text-xs text-white/60">{spec.diy.hint}</p>
            <ul className="space-y-1.5">
              {spec.diy.materials.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-white/80"
                >
                  <span className="font-medium">{m.label}</span>
                  <span className="font-bold text-amber-300">×{m.qty}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleCraft}
              disabled={crafting || craftedOk}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white transition-colors",
                craftedOk ? "bg-green-600" : crafting ? "bg-amber-500" : "bg-amber-600 hover:bg-amber-700"
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
                        ? "border-violet-400 bg-violet-500/30 text-violet-100"
                        : "border-white/15 bg-white/5 text-white/80 hover:bg-violet-500/15"
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
                            "h-16 w-7 -mx-1 z-10 border-neutral-600 text-[8px] text-white",
                            activeKeys.has(i) ? "bg-violet-600" : "bg-neutral-800 hover:bg-neutral-700"
                          )
                        : cn(
                            "h-24 w-9 border-white/20 text-[8px] text-neutral-700",
                            activeKeys.has(i)
                              ? "bg-violet-300 border-violet-400"
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
                        ? "border-violet-400 bg-violet-500/30 text-violet-100"
                        : "border-white/15 bg-white/5 text-white/80 hover:bg-violet-500/15"
                    )}
                  >
                    {layout.family === "pan_flute" ? `${i + 1}관` : midiLabel(midi)}
                  </button>
                ))}
              </div>
            )}

            <p className="text-center text-[9px] text-white/40 flex items-center justify-center gap-1">
              <Radio className="h-3 w-3" />
              실시간 합주 · Web Audio · {spec.playPose === "sit" ? "앉아서" : "서서"} 연주
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export { INSTRUMENT_SPECS };
