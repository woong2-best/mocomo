import { normalizeSdp } from "@/lib/webrtc-sdp";

/** Cloudflare Stream — WHEP 시청 (MoCoMo API 프록시 → Cloudflare) */

export class WhepNotReadyError extends Error {
  constructor() {
    super("방송 송출 연결 중… 잠시 후 자동으로 재생됩니다");
    this.name = "WhepNotReadyError";
  }
}

/** ICE 전체 수집 대기는 느림 — 짧은 trickle 윈도우 후 WHEP offer 전송 */
function waitForIceGathering(pc: RTCPeerConnection, maxWaitMs = 1800): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    const timer = setTimeout(done, maxWaitMs);
    const onChange = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

export async function attachCloudflareWhepPlayback(
  channelId: string,
  video: HTMLVideoElement
): Promise<() => void> {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    bundlePolicy: "max-bundle",
    iceCandidatePoolSize: 0,
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

  const rawSdp = pc.localDescription?.sdp;
  if (!rawSdp) throw new Error("SDP offer 생성 실패");
  const sdp = normalizeSdp(rawSdp);

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

  const answerSdp = data.answerSdp ? normalizeSdp(data.answerSdp) : "";
  if (!answerSdp) throw new Error("WHEP 응답 SDP 없음");

  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

  return () => {
    pc.close();
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
}
