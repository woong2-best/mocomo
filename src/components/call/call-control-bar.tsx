"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
} from "@livekit/components-react";
import {
  Mic,
  MicOff,
  PhoneOff,
  SwitchCamera,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
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

export function CallControlBar({
  video = false,
  onHangup,
}: {
  video?: boolean;
  onHangup: () => void;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(video);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [facingUser, setFacingUser] = useState(true);

  useEffect(() => {
    setMicOn(localParticipant.isMicrophoneEnabled);
    setCamOn(localParticipant.isCameraEnabled);
  }, [localParticipant.isMicrophoneEnabled, localParticipant.isCameraEnabled]);

  useEffect(() => {
    if (!video) return;
    if (!localParticipant.isCameraEnabled) {
      void localParticipant.setCameraEnabled(true);
      setCamOn(true);
    }
  }, [video, localParticipant]);

  const toggleMic = useCallback(async () => {
    const next = !localParticipant.isMicrophoneEnabled;
    await localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }, [localParticipant]);

  const toggleCam = useCallback(async () => {
    if (!video) return;
    const next = !localParticipant.isCameraEnabled;
    await localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }, [localParticipant, video]);

  const toggleSpeaker = useCallback(() => {
    const next = !speakerOn;
    setSpeakerOn(next);
    for (const p of remotes) {
      for (const pub of p.audioTrackPublications.values()) {
        if (pub.track) pub.track.attachedElements.forEach((el) => {
          if (el instanceof HTMLMediaElement) el.muted = !next;
        });
      }
    }
    const audios = document.querySelectorAll<HTMLAudioElement>("audio[data-lk-audio]");
    audios.forEach((el) => {
      el.muted = !next;
    });
    if (room) {
      void room.startAudio().catch(() => undefined);
    }
  }, [remotes, room, speakerOn]);

  const flipCamera = useCallback(async () => {
    if (!video) return;
    const nextFacing = !facingUser;
    setFacingUser(nextFacing);
    await localParticipant.setCameraEnabled(false);
    await localParticipant.setCameraEnabled(true, {
      facingMode: nextFacing ? "user" : "environment",
    });
    setCamOn(true);
  }, [facingUser, localParticipant, video]);

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-safe pt-6">
      <div className="mx-auto flex max-w-md items-center justify-center">
        <div className="flex items-center gap-1 rounded-full bg-neutral-800/95 px-2 py-2 shadow-lg ring-1 ring-white/10 backdrop-blur-md">
          {video && (
            <ControlIcon
              active={camOn}
              label={camOn ? "카메라 끄기" : "카메라 켜기"}
              onClick={() => void toggleCam()}
            >
              {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </ControlIcon>
          )}

          <ControlIcon
            active={micOn}
            label={micOn ? "마이크 끄기" : "마이크 켜기"}
            onClick={() => void toggleMic()}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </ControlIcon>

          {video && (
            <ControlIcon label="카메라 전환" onClick={() => void flipCamera()}>
              <SwitchCamera className="h-5 w-5" />
            </ControlIcon>
          )}

          <ControlIcon
            active={speakerOn}
            label={speakerOn ? "스피커 끄기" : "스피커 켜기"}
            onClick={toggleSpeaker}
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
