import type * as THREE from "three";

/** 단일 APT 월드에 하위 씬을 붙일 때 사용 */
export type AptSceneEmbed = {
  sharedRenderer: THREE.WebGLRenderer;
  /** 건물·복도·집 루트가 붙는 공유 씬 */
  parentScene: THREE.Scene;
  /** 이 씬의 3D 루트를 parentScene에 추가 */
  attachRoot: THREE.Group;
  /** true면 자체 RAF 루프를 돌리지 않음 — UnifiedAptWorldScene가 tick */
  externalLoop: boolean;
};
