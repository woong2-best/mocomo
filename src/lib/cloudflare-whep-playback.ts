/** Cloudflare Stream — WHEP 시청 (브라우저 WHIP 송출과 함께 사용) */

function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 8000): Promise<void> {
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

export async function attachCloudflareWhepPlayback(
  whepUrl: string,
  video: HTMLVideoElement
): Promise<() => void> {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  const stream = new MediaStream();
  pc.ontrack = (ev) => {
    if (ev.streams[0]) {
      ev.streams[0].getTracks().forEach((t) => stream.addTrack(t));
    } else if (ev.track) {
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

  const res = await fetch(whepUrl, {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: sdp,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `WHEP 연결 실패 (${res.status})`);
  }

  const answerSdp = await res.text();
  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

  return () => {
    pc.close();
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
}
