import type { AvatarConfig } from "@/lib/virtual-avatar/types";
import { DEFAULT_AVATAR_CONFIG } from "@/lib/virtual-avatar/types";

const PRESET_VERSION = 1;

export function exportPresetBlob(config: AvatarConfig): Blob {
  const payload = { version: PRESET_VERSION, config, exportedAt: new Date().toISOString() };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

export async function importPresetFile(file: File): Promise<AvatarConfig | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as { version?: number; config?: Partial<AvatarConfig> };
    if (!data.config) return null;
    return {
      ...DEFAULT_AVATAR_CONFIG,
      ...data.config,
      body: { ...DEFAULT_AVATAR_CONFIG.body, ...data.config.body },
      face: {
        ...DEFAULT_AVATAR_CONFIG.face,
        ...data.config.face,
        makeup: {
          ...DEFAULT_AVATAR_CONFIG.face.makeup,
          ...data.config.face?.makeup,
        },
      },
      skin: { ...DEFAULT_AVATAR_CONFIG.skin, ...data.config.skin },
      outfit: {
        ...DEFAULT_AVATAR_CONFIG.outfit,
        ...data.config.outfit,
        layers: { ...DEFAULT_AVATAR_CONFIG.outfit.layers, ...data.config.outfit?.layers },
      },
      hair: { ...DEFAULT_AVATAR_CONFIG.hair, ...data.config.hair },
      effects: { ...DEFAULT_AVATAR_CONFIG.effects, ...data.config.effects },
      view: { ...DEFAULT_AVATAR_CONFIG.view, ...data.config.view },
      equipped: { ...DEFAULT_AVATAR_CONFIG.equipped, ...data.config.equipped },
      paint: {
        ...DEFAULT_AVATAR_CONFIG.paint,
        ...data.config.paint,
        strokes: data.config.paint?.strokes ?? DEFAULT_AVATAR_CONFIG.paint.strokes,
      },
      sculpt: {
        ...DEFAULT_AVATAR_CONFIG.sculpt,
        ...data.config.sculpt,
        deltas: data.config.sculpt?.deltas ?? DEFAULT_AVATAR_CONFIG.sculpt.deltas,
      },
    };
  } catch {
    return null;
  }
}

export async function exportGlbFromScene(scene: import("three").Object3D): Promise<Blob | null> {
  try {
    const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");
    const exporter = new GLTFExporter();
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        scene,
        (result) => {
          if (result instanceof ArrayBuffer) resolve(result);
          else reject(new Error("unexpected glb format"));
        },
        reject,
        { binary: true }
      );
    });
    return new Blob([arrayBuffer], { type: "model/gltf-binary" });
  } catch {
    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
