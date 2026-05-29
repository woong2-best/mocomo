"use client";

import { useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

/** ControlBar 대체 — controls.map 크래시 방지 (통화 전용) */
export function LivekitSafeControls({ video = false }: { video?: boolean }) {
  const { localParticipant } = useLocalParticipant();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);

  async function toggleMic() {
    const next = !micOn;
    await localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }

  async function toggleCam() {
    if (!video) return;
    const next = !camOn;
    await localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 px-3 py-2">
      <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => void toggleMic()}>
        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        {micOn ? "마이크" : "음소거"}
      </Button>
      {video && (
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => void toggleCam()}>
          {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          {camOn ? "카메라 끔" : "카메라"}
        </Button>
      )}
    </div>
  );
}
