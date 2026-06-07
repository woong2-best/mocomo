import { livePublisherFetch } from "@/lib/live-publisher-tab";
import { normalizeSdp } from "@/lib/webrtc-sdp";

/** Cloudflare Stream — WHIP 브라우저 송출 (MoCoMo API 프록시 → Cloudflare) */

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
    channelId: string,
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

    const rawSdp = pc.localDescription?.sdp;
    if (!rawSdp) throw new Error("SDP offer 생성 실패");
    const sdp = normalizeSdp(rawSdp);

    let res: Response;
    try {
      res = await livePublisherFetch(`/api/live/${channelId}/whip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp }),
      });
    } catch (e) {
      const hint =
        e instanceof TypeError && e.message === "Failed to fetch"
          ? "송출 서버에 연결하지 못했습니다. 네트워크·로그인 상태를 확인해 주세요."
          : e instanceof Error
            ? e.message
            : "WHIP 네트워크 오류";
      throw new Error(hint);
    }

    const data = (await res.json().catch(() => ({}))) as {
      answerSdp?: string;
      error?: string;
      publishState?: string;
    };

    if (!res.ok) {
      throw new Error(data.error || `WHIP 연결 실패 (${res.status})`);
    }

    const answerSdp = data.answerSdp ? normalizeSdp(data.answerSdp) : "";
    if (!answerSdp) throw new Error("WHIP 응답 SDP 없음");

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
