"use client";

import { useCallback, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
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

export function CallSettingsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [audioEnhance, setAudioEnhance] = useState(true);

  const applyAudioOptions = useCallback(
    async (noise: boolean, enhance: boolean) => {
      const wasOn = localParticipant.isMicrophoneEnabled;
      if (wasOn) await localParticipant.setMicrophoneEnabled(false);
      if (wasOn) {
        await localParticipant.setMicrophoneEnabled(true, {
          echoCancellation: enhance,
          noiseSuppression: noise,
          autoGainControl: enhance,
        });
      }
    },
    [localParticipant]
  );

  const onNoiseChange = (next: boolean) => {
    setNoiseSuppression(next);
    void applyAudioOptions(next, audioEnhance);
  };

  const onEnhanceChange = (next: boolean) => {
    setAudioEnhance(next);
    void applyAudioOptions(noiseSuppression, next);
  };

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
