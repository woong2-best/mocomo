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

function waitForPeerConnected(pc: RTCPeerConnection, timeoutMs = 20000): Promise<void> {
  if (pc.connectionState === "connected") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("카메라 송출이 Cloudflare에 연결되지 않았습니다. 방송을 다시 시작해 주세요.")),
      timeoutMs
    );
    const onState = () => {
      if (pc.connectionState === "connected") {
        clearTimeout(timer);
        pc.removeEventListener("connectionstatechange", onState);
        resolve();
      } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        clearTimeout(timer);
        pc.removeEventListener("connectionstatechange", onState);
        reject(new Error("카메라 송출 연결 실패"));
      }
    };
    pc.addEventListener("connectionstatechange", onState);
    onState();
  });
}

export class CloudflareWhipPublisher {
  private pc: RTCPeerConnection | null = null;
  private onDisconnect: (() => void) | null = null;

  async start(
    whipUrl: string,
    mediaStream: MediaStream,
    opts?: { onDisconnect?: () => void }
  ): Promise<void> {
    this.onDisconnect = opts?.onDisconnect ?? null;
    this.stop();
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.pc = pc;

    for (const track of mediaStream.getTracks()) {
      const tx = pc.addTransceiver(track, {
        direction: "sendonly",
        streams: [mediaStream],
      });
      if (track.kind === "video" && typeof RTCRtpSender !== "undefined") {
        try {
          const caps = RTCRtpSender.getCapabilities("video");
          const h264 = caps?.codecs?.filter((c) =>
            c.mimeType.toLowerCase().includes("h264")
          );
          if (h264?.length) tx.setCodecPreferences(h264);
        } catch {
          /* 일부 브라우저 미지원 */
        }
      }
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
    await waitForPeerConnected(pc);

    pc.addEventListener("connectionstatechange", () => {
      const state = pc.connectionState;
      if (state === "failed" || state === "closed") {
        this.onDisconnect?.();
      } else if (state === "disconnected") {
        window.setTimeout(() => {
          if (this.pc !== pc) return;
          if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            this.onDisconnect?.();
          }
        }, 4000);
      }
    });
  }

  get connected() {
    return this.pc?.connectionState === "connected";
  }

  stop() {
    this.onDisconnect = null;
    this.pc?.close();
    this.pc = null;
  }
}
