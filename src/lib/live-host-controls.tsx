"use client";

import { useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, MonitorUp } from "lucide-react";

/** LiveKit ControlBar 대체 — controls 객체 .map 크래시 방지 */
export function LiveHostMediaControls() {
  const { localParticipant } = useLocalParticipant();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  async function toggleMic() {
    const next = !micOn;
    await localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }

  async function toggleCam() {
    const next = !camOn;
    await localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }

  async function toggleScreen() {
    const next = !screenOn;
    await localParticipant.setScreenShareEnabled(next);
    setScreenOn(next);
  }

  return (
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
    </div>
  );
}
