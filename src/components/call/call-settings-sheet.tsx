"use client";

import { useCallback, useState } from "react";
import { AudioLines, Waves } from "lucide-react";
import { CallBottomSheet } from "@/components/call/call-bottom-sheet";
import { cn } from "@/lib/utils";

function SettingRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center text-white/90">
        <Icon className="h-5 w-5" />
      </div>
      <span className="flex-1 text-[15px]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-emerald-500" : "bg-white/20"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

async function applyAudioTrackOptions(
  stream: MediaStream | null,
  opts: { noiseSuppression: boolean; echoCancellation: boolean; autoGainControl: boolean }
) {
  for (const track of stream?.getAudioTracks() ?? []) {
    try {
      await track.applyConstraints({
        noiseSuppression: opts.noiseSuppression,
        echoCancellation: opts.echoCancellation,
        autoGainControl: opts.autoGainControl,
      });
    } catch {
      /* browser may reject mid-call constraint changes */
    }
  }
}

/** DM P2P call settings — no LiveKit Room context. */
export function CallSettingsSheet({
  open,
  onClose,
  localStream,
}: {
  open: boolean;
  onClose: () => void;
  localStream?: MediaStream | null;
}) {
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [audioEnhance, setAudioEnhance] = useState(true);

  const applyAudioOptions = useCallback(
    async (noise: boolean, enhance: boolean) => {
      await applyAudioTrackOptions(localStream ?? null, {
        noiseSuppression: noise,
        echoCancellation: enhance,
        autoGainControl: enhance,
      });
    },
    [localStream]
  );

  const onNoiseChange = (next: boolean) => {
    setNoiseSuppression(next);
    void applyAudioOptions(next, audioEnhance);
  };

  const onEnhanceChange = (next: boolean) => {
    setAudioEnhance(next);
    void applyAudioOptions(noiseSuppression, next);
  };

  if (!open) return null;

  return (
    <CallBottomSheet open={open} onClose={onClose} title="설정">
      <SettingRow
        icon={Waves}
        label="오디오 잡음 억제"
        checked={noiseSuppression}
        onChange={onNoiseChange}
      />
      <SettingRow
        icon={AudioLines}
        label="오디오 보정 효과"
        checked={audioEnhance}
        onChange={onEnhanceChange}
      />
    </CallBottomSheet>
  );
}
