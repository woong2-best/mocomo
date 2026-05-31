/** Cloudflare Stream — WHIP 브라우저 송출 (OBS 없음) */

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

export class CloudflareWhipPublisher {
  private pc: RTCPeerConnection | null = null;

  async start(whipUrl: string, mediaStream: MediaStream): Promise<void> {
    this.stop();
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.pc = pc;

    for (const track of mediaStream.getTracks()) {
      pc.addTrack(track, mediaStream);
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGathering(pc);

    const sdp = pc.localDescription?.sdp;
    if (!sdp) throw new Error("SDP offer 생성 실패");

    const res = await fetch(whipUrl, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: sdp,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `WHIP 연결 실패 (${res.status})`);
    }

    const answerSdp = await res.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  stop() {
    this.pc?.getSenders().forEach((s) => s.track?.stop());
    this.pc?.close();
    this.pc = null;
  }
}
