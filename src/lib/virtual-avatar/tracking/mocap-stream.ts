import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import { mapMocapBone } from "@/lib/virtual-avatar/tracking/mocap-bone-map";

export type MocapStreamBone = { x: number; y: number; z: number };

export type MocapStreamFrame = Record<string, MocapStreamBone>;

/** Perception Neuron / Rokoko / 커스텀 JSON WebSocket 모캡 */
export class MocapStreamClient {
  private ws: WebSocket | null = null;
  private playing = false;

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  isPlaying() {
    return this.playing;
  }

  connect(url: string, onError?: (msg: string) => void): Promise<boolean> {
    this.disconnect();

    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(url);
        this.ws = ws;

        ws.onopen = () => {
          this.playing = true;
          resolve(true);
        };
        ws.onerror = () => {
          onError?.("모캡 스트림 연결 실패");
          resolve(false);
        };
        ws.onclose = () => {
          this.playing = false;
        };
      } catch {
        onError?.("WebSocket을 열 수 없습니다.");
        resolve(false);
      }
    });
  }

  disconnect() {
    this.playing = false;
    this.ws?.close();
    this.ws = null;
  }

  applyFrame(vrm: VRM, frame: MocapStreamFrame) {
    const humanoid = vrm.humanoid;
    if (!humanoid) return;

    for (const [rawName, rot] of Object.entries(frame)) {
      const bone = mapMocapBone(rawName);
      if (!bone) continue;
      const node = humanoid.getNormalizedBoneNode(bone);
      if (!node) continue;
      node.rotation.x = THREE.MathUtils.lerp(node.rotation.x, rot.x, 0.35);
      node.rotation.y = THREE.MathUtils.lerp(node.rotation.y, rot.y, 0.35);
      node.rotation.z = THREE.MathUtils.lerp(node.rotation.z, rot.z, 0.35);
    }
  }

  poll(onFrame: (frame: MocapStreamFrame) => void) {
    if (!this.ws) return;
    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as unknown;
        if (!data || typeof data !== "object") return;
        const bones =
          "bones" in data && data.bones && typeof data.bones === "object"
            ? (data.bones as MocapStreamFrame)
            : (data as MocapStreamFrame);
        onFrame(bones);
      } catch {
        /* skip */
      }
    };
  }
}
