"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";
import { LIVE_BROADCAST_ROOM_OPTIONS } from "@/lib/live-broadcast-options";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, MicOff, MonitorUp, Radio, Video, VideoOff } from "lucide-react";

/** 호스트 브라우저 송출 — 통화와 같은 livekit-client, components-react 제거 */
export function LiveKitNativeHost({
  channelId,
  onEndStream,
}: {
  channelId: string;
  onEndStream: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const creds = await fetchLivekitCredentials(channelId);
        const room = new Room(LIVE_BROADCAST_ROOM_OPTIONS);
        roomRef.current = room;

        room.on(RoomEvent.LocalTrackPublished, (pub) => {
          const track = pub.track;
          if (!track || track.kind !== Track.Kind.Video || !videoRef.current) return;
          if (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.Camera) {
            track.attach(videoRef.current);
          }
        });

        await room.connect(creds.serverUrl, creds.token);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (!mounted) return;
        setLoading(false);
        setMicOn(true);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "방송 서버 연결 실패");
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, [channelId]);

  async function toggleMic() {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }

  async function toggleCam() {
    const room = roomRef.current;
    if (!room) return;
    const next = !camOn;
    if (next && screenOn) await room.localParticipant.setScreenShareEnabled(false);
    await room.localParticipant.setCameraEnabled(next);
    setCamOn(next);
    if (next) setScreenOn(false);
  }

  async function toggleScreen() {
    const room = roomRef.current;
    if (!room) return;
    const next = !screenOn;
    if (next && camOn) await room.localParticipant.setCameraEnabled(false);
    await room.localParticipant.setScreenShareEnabled(next);
    setScreenOn(next);
    if (next) setCamOn(false);
  }

  if (error) {
    return (
      <div className="space-y-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
        <p className="text-sm text-destructive">{error}</p>
        <p className="text-xs text-muted-foreground">
          브라우저 방송이 안 되면 방송 만들 때 <strong>OBS</strong> 모드를 선택해 주세요.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center aspect-video rounded-2xl bg-muted/40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline muted />
        {!camOn && !screenOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2">
            <Radio className="h-10 w-10" />
            <p className="text-sm">카메라 또는 화면 공유를 켜 주세요</p>
          </div>
        )}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-red-600 text-white text-xs font-bold">
          LIVE
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => void toggleMic()}>
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          {micOn ? "마이크" : "음소거"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => void toggleCam()}>
          {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          {camOn ? "카메라 끔" : "카메라"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => void toggleScreen()}>
          <MonitorUp className="h-4 w-4" />
          {screenOn ? "화면공유 끔" : "화면 공유"}
        </Button>
        <Button variant="destructive" size="sm" className="rounded-xl ml-auto" onClick={onEndStream}>
          방송 종료
        </Button>
      </div>
    </div>
  );
}
