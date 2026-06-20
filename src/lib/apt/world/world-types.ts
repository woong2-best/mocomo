import type * as THREE from "three";

/** APT 통합 월드 — 단일 연속 3D 공간 모드 */
export type AptWorldMode =
  | "district"   // 멀리서 단지 전체 (1000층 외관)
  | "tower"      // 층별 단면 / 외관
  | "elevator"   // 엘리베이터 탑승·이동
  | "lobby"      // 1층 로비·주차장·계단
  | "corridor"   // 복도 보행
  | "interior";  // 집 내부

export type DoorState = "open" | "closed" | "locked";

export type WorldTransition =
  | { kind: "idle" }
  | { kind: "fly_to_floor"; floor: number; duration: number; elapsed: number }
  | { kind: "enter_corridor"; floor: number; duration: number; elapsed: number }
  | { kind: "enter_interior"; duration: number; elapsed: number }
  | { kind: "exit_interior"; duration: number; elapsed: number };

export type UnifiedSceneEmbed = {
  scene: THREE.Scene;
  worldRoot: THREE.Group;
  requestRender: () => void;
  getMount: () => HTMLElement;
};
