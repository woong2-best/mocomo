"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { LiveTipAlert } from "@/components/live/live-donation-alert-overlay";
import type {
  LiveSupportEventPayload,
  LiveSupportMissionPayload,
  LiveSupportPollPayload,
} from "@/lib/live-support/types";
import { isSoundPresetId, subscribeLiveSupport } from "@/hooks/use-live-support-socket";
import { playCheerSound } from "@/lib/live-support/sounds";
import { speakCheerMessage } from "@/lib/live-support/tts-client";

function eventToAlert(evt: LiveSupportEventPayload): LiveTipAlert {
  const rouletteLabel =
    typeof evt.metadata?.rouletteLabel === "string" ? evt.metadata.rouletteLabel : undefined;
  return {
    id: evt.id,
    amount: evt.amount,
    message: evt.message,
    username: evt.username,
    at: evt.at,
    kind: "cheer",
    eventType: evt.type,
    rouletteLabel,
  };
}

/** 실시간 응원 이벤트 → 알림·TTS·사운드 */
export function LiveSupportBridge({
  socket,
  isHost,
  onAlert,
  onMission,
  onPoll,
}: {
  socket: Socket | null;
  isHost: boolean;
  onAlert: (alert: LiveTipAlert) => void;
  onMission: (m: LiveSupportMissionPayload) => void;
  onPoll: (p: LiveSupportPollPayload) => void;
}) {
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;
  const missionsRef = useRef<Map<string, LiveSupportMissionPayload>>(new Map());
  const [, bump] = useState(0);

  const handleMission = useCallback(
    (m: LiveSupportMissionPayload) => {
      missionsRef.current.set(m.id, m);
      onMission(m);
      bump((n) => n + 1);
    },
    [onMission]
  );

  useEffect(() => {
    return subscribeLiveSupport(socket, {
      onEvent: (evt) => {
        onAlertRef.current(eventToAlert(evt));
        if (isHost) {
          if (evt.type === "TTS" && evt.message) {
            speakCheerMessage(evt.message);
          }
          if (evt.type === "SOUND") {
            const sid = evt.metadata?.soundId;
            if (isSoundPresetId(sid)) playCheerSound(sid);
          }
        }
      },
      onMission: handleMission,
      onPoll: (p) => onPoll(p),
    });
  }, [socket, isHost, handleMission, onPoll]);

  return null;
}
