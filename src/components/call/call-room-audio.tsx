"use client";

import { useEffect } from "react";
import { RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";

/** 원격 음성 재생 시작 + 브라우저 오디오 출력 활성화 */
export function CallRoomAudio() {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const enablePlayback = () => {
      room.startAudio().catch(() => {});
    };

    if (room.state === "connected") {
      enablePlayback();
    }
    room.on(RoomEvent.Connected, enablePlayback);

    return () => {
      room.off(RoomEvent.Connected, enablePlayback);
    };
  }, [room]);

  return <RoomAudioRenderer volume={1} />;
}
