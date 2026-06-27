"use client";

import { Flat2dAvatarScene } from "@/lib/avatar-2d/flat-2d-scene";
import { PhotoAvatarScene } from "@/lib/photo-avatar/photo-avatar-scene";
import type { PhotoAvatarRenderMode } from "@/lib/photo-avatar/types";
import type { VirtualAvatar3DScene } from "@/lib/virtual-avatar/avatar-3d-scene";

export type AvatarSceneInstance = VirtualAvatar3DScene | PhotoAvatarScene | Flat2dAvatarScene;

export function createAvatarScene(host: HTMLElement, mode: PhotoAvatarRenderMode): AvatarSceneInstance {
  if (mode === "photo") return new PhotoAvatarScene(host);
  return new Flat2dAvatarScene(host);
}

export async function reloadAvatarScene(scene: AvatarSceneInstance | null) {
  if (!scene) return;
  scene.refreshExternalConfig?.();
  if (scene instanceof PhotoAvatarScene || scene instanceof Flat2dAvatarScene) {
    await scene.reloadFromStorage();
    scene.fitVtuberBroadcastView();
  }
}

export function disposeAvatarScene(scene: AvatarSceneInstance | null) {
  if (!scene) return;
  scene.stop();
  if (scene instanceof PhotoAvatarScene || scene instanceof Flat2dAvatarScene) {
    scene.dispose();
  }
}
