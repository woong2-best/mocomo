"use client";

import { Mic, MicOff, PhoneOff, SwitchCamera, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function ControlIcon({
  active,
  danger,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  danger?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors",
        danger
          ? "bg-red-500 text-white hover:bg-red-600"
          : active
            ? "bg-white/15 text-white hover:bg-white/20"
            : "text-white/90 hover:bg-white/10"
      )}
    >
      {children}
    </button>
  );
}

export function PeerCallControlBar({
  video = false,
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onFlipCamera,
  onHangup,
}: {
  video?: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onFlipCamera: () => void;
  onHangup: () => void;
}) {
  const [speakerOn, setSpeakerOn] = useState(true);

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-safe pt-6">
      <div className="mx-auto flex max-w-md items-center justify-center">
        <div className="flex items-center gap-1 rounded-full bg-neutral-800/95 px-2 py-2 shadow-lg ring-1 ring-white/10 backdrop-blur-md">
          {video && (
            <ControlIcon
              active={cameraEnabled}
              label={cameraEnabled ? "카메라 끄기" : "카메라 켜기"}
              onClick={onToggleCamera}
            >
              {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </ControlIcon>
          )}

          <ControlIcon
            active={micEnabled}
            label={micEnabled ? "마이크 끄기" : "마이크 켜기"}
            onClick={onToggleMic}
          >
            {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </ControlIcon>

          {video && (
            <ControlIcon label="카메라 전환" onClick={onFlipCamera}>
              <SwitchCamera className="h-5 w-5" />
            </ControlIcon>
          )}

          <ControlIcon
            active={speakerOn}
            label={speakerOn ? "스피커 끄기" : "스피커 켜기"}
            onClick={() => setSpeakerOn((v) => !v)}
          >
            {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </ControlIcon>

          <ControlIcon danger label="통화 종료" onClick={onHangup}>
            <PhoneOff className="h-5 w-5" />
          </ControlIcon>
        </div>
      </div>
    </div>
  );
}
