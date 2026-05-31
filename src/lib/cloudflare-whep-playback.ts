/** Cloudflare Stream — WHEP 시청 (MoCoMo API 프록시 → Cloudflare) */

export class WhepNotReadyError extends Error {
  constructor() {
    super("방송 송출 연결 중… 10~30초 후 자동으로 재생됩니다");
    this.name = "WhepNotReadyError";
  }
}

function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 12000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("ICE gathering timeout")), timeoutMs);
    const onChange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timer);
        pc.removeEventListener("icegatheringstatechange", onChange);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

function waitForMedia(
  pc: RTCPeerConnection,
  stream: MediaStream,
  timeoutMs = 20000
): Promise<void> {
  if (stream.getTracks().length > 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("영상 신호를 받지 못했습니다. 잠시 후 다시 시도해 주세요.")),
      timeoutMs
    );
    const onTrack = () => {
      if (stream.getTracks().length > 0) {
        clearTimeout(timer);
        pc.removeEventListener("track", onTrack);
        resolve();
      }
    };
    pc.addEventListener("track", onTrack);
    const onState = () => {
      if (pc.connectionState === "connected" && stream.getTracks().length > 0) {
        clearTimeout(timer);
        pc.removeEventListener("connectionstatechange", onState);
        pc.removeEventListener("track", onTrack);
        resolve();
      }
      if (pc.connectionState === "failed") {
        clearTimeout(timer);
        reject(new Error("실시간 연결 실패"));
      }
    };
    pc.addEventListener("connectionstatechange", onState);
  });
}

export async function attachCloudflareWhepPlayback(
  channelId: string,
  video: HTMLVideoElement
): Promise<() => void> {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
    bundlePolicy: "max-bundle",
  });

  const stream = new MediaStream();
  pc.ontrack = (ev) => {
    if (ev.streams[0]) {
      ev.streams[0].getTracks().forEach((t) => {
        if (!stream.getTracks().includes(t)) stream.addTrack(t);
      });
    } else if (ev.track && !stream.getTracks().includes(ev.track)) {
      stream.addTrack(ev.track);
    }
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  };

  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGathering(pc);

  const sdp = pc.localDescription?.sdp;
  if (!sdp) throw new Error("SDP offer 생성 실패");

  const res = await fetch(`/api/live/${channelId}/whep`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sdp }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    answerSdp?: string;
    error?: string;
    notReady?: boolean;
  };

  if (!res.ok) {
    if (res.status === 409 || data.notReady) {
      throw new WhepNotReadyError();
    }
    throw new Error(data.error || `WHEP 연결 실패 (${res.status})`);
  }

  const answerSdp = data.answerSdp?.trim();
  if (!answerSdp) throw new Error("WHEP 응답 SDP 없음");

  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  await waitForMedia(pc, stream);

  return () => {
    pc.close();
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
}
