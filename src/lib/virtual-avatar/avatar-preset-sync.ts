import {
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_EQUIPPED,
  type AvatarConfig,
} from "@/lib/virtual-avatar/types";
import { normalizeFaceShape } from "@/lib/virtual-avatar/face-shape-profiles";

export const AVATAR_PRESET_STORAGE_KEY = "mocomo_avatar_preset_v3";
export const AVATAR_PRESET_VERSION_KEY = "mocomo_avatar_preset_ver";
export const AVATAR_UPDATED_EVENT = "mocomo-avatar-updated";
export const AVATAR_VRM_SLOT_EVENT = "mocomo-avatar-vrm-changed";
export const AVATAR_MOCAP_STREAM_KEY = "mocomo_avatar_mocap_ws";

const CHANNEL_NAME = "mocomo-avatar-sync";
const CLOUD_POLL_MS = 60_000;

function presetSignature(config: AvatarConfig): string {
  return JSON.stringify({
    equipped: config.equipped,
    face: config.face,
    body: config.body,
    hair: config.hair,
    outfit: config.outfit,
    skin: config.skin,
    style: config.style,
    effects: { celShading: config.effects.celShading, renderQuality: config.effects.renderQuality },
  });
}

export type AvatarPresetSyncSource = "local" | "tab" | "storage" | "cloud" | "focus";

export function mergeStoredConfig(parsed: Partial<AvatarConfig>): AvatarConfig {
  return {
    ...DEFAULT_AVATAR_CONFIG,
    ...parsed,
    style: parsed.style ?? DEFAULT_AVATAR_CONFIG.style,
    body: {
      ...DEFAULT_AVATAR_CONFIG.body,
      ...parsed.body,
      armThickness: parsed.body?.armThickness ?? DEFAULT_AVATAR_CONFIG.body.armThickness,
    },
    face: {
      ...DEFAULT_AVATAR_CONFIG.face,
      ...parsed.face,
      faceShape: normalizeFaceShape(parsed.face?.faceShape),
      eyeColorHex: parsed.face?.eyeColorHex ?? DEFAULT_AVATAR_CONFIG.face.eyeColorHex,
      makeup: {
        ...DEFAULT_AVATAR_CONFIG.face.makeup,
        ...parsed.face?.makeup,
        lipColorHex: parsed.face?.makeup?.lipColorHex ?? DEFAULT_AVATAR_CONFIG.face.makeup.lipColorHex,
      },
    },
    skin: { ...DEFAULT_AVATAR_CONFIG.skin, ...parsed.skin },
    outfit: {
      ...DEFAULT_AVATAR_CONFIG.outfit,
      ...parsed.outfit,
      layers: { ...DEFAULT_AVATAR_CONFIG.outfit.layers, ...parsed.outfit?.layers },
    },
    hair: {
      ...DEFAULT_AVATAR_CONFIG.hair,
      ...parsed.hair,
      colorHex:
        parsed.hair?.colorHex ??
        DEFAULT_AVATAR_CONFIG.hair.colorHex,
      autoSkinContrast:
        parsed.hair?.autoSkinContrast ??
        DEFAULT_AVATAR_CONFIG.hair.autoSkinContrast,
    },
    effects: { ...DEFAULT_AVATAR_CONFIG.effects, ...parsed.effects },
    view: { ...DEFAULT_AVATAR_CONFIG.view, ...parsed.view },
    equipped: { ...DEFAULT_EQUIPPED },
    paint: {
      ...DEFAULT_AVATAR_CONFIG.paint,
      ...parsed.paint,
      strokes: parsed.paint?.strokes ?? DEFAULT_AVATAR_CONFIG.paint.strokes,
    },
    sculpt: {
      ...DEFAULT_AVATAR_CONFIG.sculpt,
      ...parsed.sculpt,
      deltas: parsed.sculpt?.deltas ?? DEFAULT_AVATAR_CONFIG.sculpt.deltas,
    },
  };
}

export function getPresetVersion(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(AVATAR_PRESET_VERSION_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function loadAvatarPresetFromStorage(): AvatarConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(AVATAR_PRESET_STORAGE_KEY) ??
      localStorage.getItem("mocomo_avatar_preset_v1");
    if (!raw) return null;
    return mergeStoredConfig(JSON.parse(raw) as Partial<AvatarConfig>);
  } catch {
    return null;
  }
}

export function publishAvatarPreset(config: AvatarConfig, opts?: { silent?: boolean }) {
  if (typeof window === "undefined") return getPresetVersion();
  const version = Date.now();
  localStorage.setItem(AVATAR_PRESET_STORAGE_KEY, JSON.stringify(config));
  localStorage.setItem(AVATAR_PRESET_VERSION_KEY, String(version));
  if (!opts?.silent) {
    window.dispatchEvent(new Event(AVATAR_UPDATED_EVENT));
  }
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: "preset", version });
    bc.close();
  } catch {
    /* BroadcastChannel unavailable */
  }
  return version;
}

export function notifyVrmSlotChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AVATAR_VRM_SLOT_EVENT));
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: "vrm" });
    bc.close();
  } catch {
    /* ignore */
  }
}

export async function pullCloudAvatarPreset(): Promise<AvatarConfig | null> {
  try {
    const res = await fetch("/api/avatar/preset", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { preset?: { config?: Partial<AvatarConfig>; updatedAt?: string } };
    if (!data.preset?.config) return null;
    return mergeStoredConfig(data.preset.config);
  } catch {
    return null;
  }
}

type SyncHandler = (config: AvatarConfig, source: AvatarPresetSyncSource) => void;

/** 스튜디오·라이브·OBS 탭 간 프리셋 동기화 (BroadcastChannel + storage + 클라우드) */
export function subscribeAvatarPresetSync(onUpdate: SyncHandler): () => void {
  if (typeof window === "undefined") return () => undefined;

  let lastVersion = getPresetVersion();
  let cloudTimer = 0;
  let disposed = false;

  const emitFromStorage = (source: AvatarPresetSyncSource) => {
    const version = getPresetVersion();
    if (version <= lastVersion && source !== "focus") return;
    const config = loadAvatarPresetFromStorage();
    if (!config) return;
    lastVersion = version;
    onUpdate(config, source);
  };

  const onStorage = (e: StorageEvent) => {
    if (
      e.key === AVATAR_PRESET_STORAGE_KEY ||
      e.key === AVATAR_PRESET_VERSION_KEY ||
      e.key?.startsWith("mocomo_avatar")
    ) {
      emitFromStorage("storage");
    }
  };

  const onLocalEvent = () => emitFromStorage("local");

  const onVrmEvent = () => onUpdate(loadAvatarPresetFromStorage() ?? DEFAULT_AVATAR_CONFIG, "tab");

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (ev: MessageEvent<{ type?: string; version?: number }>) => {
      if (ev.data?.type === "preset") {
        const remoteVer = ev.data.version ?? getPresetVersion();
        if (remoteVer > lastVersion) emitFromStorage("tab");
      }
      if (ev.data?.type === "vrm") onVrmEvent();
    };
  } catch {
    bc = null;
  }

  const pullCloud = async () => {
    if (disposed) return;
    const local = loadAvatarPresetFromStorage();
    const cloud = await pullCloudAvatarPreset();
    if (!cloud || disposed) return;
    if (local && presetSignature(local) === presetSignature(cloud)) return;
    const version = Date.now();
    localStorage.setItem(AVATAR_PRESET_STORAGE_KEY, JSON.stringify(cloud));
    localStorage.setItem(AVATAR_PRESET_VERSION_KEY, String(version));
    lastVersion = version;
    onUpdate(cloud, "cloud");
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      emitFromStorage("focus");
      void pullCloud();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(AVATAR_UPDATED_EVENT, onLocalEvent);
  window.addEventListener(AVATAR_VRM_SLOT_EVENT, onVrmEvent);
  document.addEventListener("visibilitychange", onVisibility);
  cloudTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") void pullCloud();
  }, CLOUD_POLL_MS);

  return () => {
    disposed = true;
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(AVATAR_UPDATED_EVENT, onLocalEvent);
    window.removeEventListener(AVATAR_VRM_SLOT_EVENT, onVrmEvent);
    document.removeEventListener("visibilitychange", onVisibility);
    window.clearInterval(cloudTimer);
    bc?.close();
  };
}
