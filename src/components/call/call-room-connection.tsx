"use client";

import { useEffect, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { ConnectionState, RoomEvent } from "livekit-client";
import { Loader2 } from "lucide-react";

/** 일시 끊김 시 자동 재연결 — 즉시 통화 종료하지 않음 */
export function CallRoomConnection() {
  const room = useRoomContext();
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (!room) return;

    const sync = () => {
      const s = room.state;
      setReconnecting(s === ConnectionState.Reconnecting || s === ConnectionState.SignalReconnecting);
    };

    const onReconnecting = () => setReconnecting(true);
    const onReconnected = () => setReconnecting(false);
    const onConnected = () => setReconnecting(false);

    sync();
    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);
    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.Disconnected, onReconnecting);

    return () => {
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Disconnected, onReconnecting);
    };
  }, [room]);

  if (!reconnecting) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/15 border-b border-amber-500/20">
      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      연결이 잠시 끊겼습니다. 재연결 중…
    </div>
  );
}
