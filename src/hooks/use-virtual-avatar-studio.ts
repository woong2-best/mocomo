"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_AVATAR_CONFIG,
  type AvatarConfig,
  type AvatarMakeupParams,
  type AvatarPaintStroke,
  type AvatarSculptParams,
  type AvatarStyle,
} from "@/lib/virtual-avatar/types";
import {
  applyEquippedToConfig,
  equipItem,
  getCatalogItem,
  type CatalogItem,
} from "@/lib/virtual-avatar/avatar-catalog";
import { getFaceShapeLabel } from "@/lib/virtual-avatar/face-shape-profiles";
import {
  loadWishlist,
  saveWishlist,
} from "@/lib/virtual-avatar/avatar-wallet";
import {
  clearAllVrmSlots,
  deleteVrmSlot,
  listVrmSlots,
  loadActiveVrm,
  loadVrmSlot,
  saveVrmSlot,
  setActiveVrmSlotId,
  type VrmSlotMeta,
} from "@/lib/virtual-avatar/vrm-storage";
import { exportPresetBlob, importPresetFile } from "@/lib/virtual-avatar/avatar-export";
import {
  AVATAR_PRESET_STORAGE_KEY,
  AVATAR_UPDATED_EVENT,
  loadAvatarPresetFromStorage,
  mergeStoredConfig,
  notifyVrmSlotChanged,
  publishAvatarPreset,
  subscribeAvatarPresetSync,
} from "@/lib/virtual-avatar/avatar-preset-sync";

export { AVATAR_PRESET_STORAGE_KEY, AVATAR_UPDATED_EVENT };

export function useVirtualAvatarStudio() {
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [vrmModelName, setVrmModelName] = useState<string | null>(null);
  const [vrmSlots, setVrmSlots] = useState<VrmSlotMeta[]>([]);
  const [activeVrmId, setActiveVrmId] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<string[]>(() => loadWishlist());
  const [shopMsg, setShopMsg] = useState("");

  const refreshVrmSlots = useCallback(async () => {
    const slots = await listVrmSlots();
    setVrmSlots(slots);
    const active = await loadActiveVrm();
    setActiveVrmId(active?.id ?? null);
    setVrmModelName(active?.name ?? null);
  }, []);

  useEffect(() => {
    const stored = loadAvatarPresetFromStorage();
    if (stored) setConfig(stored);
    setWishlist(loadWishlist());
    void refreshVrmSlots();
    setLoaded(true);
  }, [refreshVrmSlots]);

  /** 다른 탭·기기(클라우드)에서 프리셋 변경 시 반영 */
  useEffect(() => {
    if (!loaded) return;
    return subscribeAvatarPresetSync((next, source) => {
      if (source === "local") return;
      setConfig(next);
    });
  }, [loaded]);

  /** 스튜디오 변경 → localStorage + BroadcastChannel + 라이브 VTuber 동기화 */
  const lastCloudPushRef = useRef(0);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      publishAvatarPreset(config);
      const now = Date.now();
      if (now - lastCloudPushRef.current > 45_000) {
        lastCloudPushRef.current = now;
        void fetch("/api/avatar/preset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "기본", config }),
        }).catch(() => undefined);
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [config, loaded]);

  type ConfigSectionKey = Exclude<keyof AvatarConfig, "style">;

  const patch = useCallback(<K extends ConfigSectionKey>(key: K, value: Partial<AvatarConfig[K]>) => {
    setConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...value },
    }));
  }, []);

  const setStyle = useCallback((style: AvatarStyle) => {
    setConfig((prev) => ({ ...prev, style }));
  }, []);

  const setBody = useCallback((value: Partial<AvatarConfig["body"]>) => patch("body", value), [patch]);
  const setFace = useCallback((value: Partial<AvatarConfig["face"]>) => patch("face", value), [patch]);
  const setMakeup = useCallback(
    (value: Partial<AvatarMakeupParams>) =>
      setConfig((prev) => ({
        ...prev,
        face: { ...prev.face, makeup: { ...prev.face.makeup, ...value } },
      })),
    []
  );
  const setSkin = useCallback((value: Partial<AvatarConfig["skin"]>) => patch("skin", value), [patch]);
  const setOutfit = useCallback((value: Partial<AvatarConfig["outfit"]>) => patch("outfit", value), [patch]);
  const setHair = useCallback((value: Partial<AvatarConfig["hair"]>) => patch("hair", value), [patch]);
  const setEffects = useCallback((value: Partial<AvatarConfig["effects"]>) => patch("effects", value), [patch]);
  const setView = useCallback((value: Partial<AvatarConfig["view"]>) => patch("view", value), [patch]);
  const setPaint = useCallback((value: Partial<AvatarConfig["paint"]>) => patch("paint", value), [patch]);
  const setSculpt = useCallback((value: Partial<AvatarSculptParams>) => patch("sculpt", value), [patch]);

  const addPaintStroke = useCallback((stroke: AvatarPaintStroke) => {
    setConfig((prev) => ({
      ...prev,
      paint: { ...prev.paint, strokes: [...prev.paint.strokes, stroke] },
    }));
  }, []);

  const clearPaint = useCallback(() => {
    setPaint({ strokes: [] });
  }, [setPaint]);

  const clearSculpt = useCallback(() => {
    setSculpt({ deltas: [] });
  }, [setSculpt]);

  const equipCatalogItem = useCallback((item: CatalogItem) => {
    setConfig((prev) => {
      const equipped = equipItem(prev.equipped, item);
      return applyEquippedToConfig(equipped, prev);
    });
    setShopMsg(`${item.name} 착용`);
  }, []);

  const toggleWishlist = useCallback((itemId: string) => {
    setWishlist((prev) => {
      const next = prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId];
      saveWishlist(next);
      return next;
    });
  }, []);

  const isItemEquipped = useCallback(
    (item: CatalogItem) => {
      const e = config.equipped;
      return (
        e.hairId === item.id ||
        e.topId === item.id ||
        e.bottomId === item.id ||
        e.shoesId === item.id ||
        e.headwearId === item.id ||
        e.accessoryId === item.id ||
        e.fullOutfitId === item.id ||
        e.makeupId === item.id
      );
    },
    [config.equipped]
  );

  const resetView = useCallback(() => {
    setView({ zoom: 1, rotation: 0, autoRotate: false });
  }, [setView]);

  const zoomIn = useCallback(() => {
    setView({ zoom: Math.min(2, config.view.zoom + 0.15) });
  }, [config.view.zoom, setView]);

  const zoomOut = useCallback(() => {
    setView({ zoom: Math.max(0.5, config.view.zoom - 0.15) });
  }, [config.view.zoom, setView]);

  const toggleAutoRotate = useCallback(() => {
    setView({ autoRotate: !config.view.autoRotate });
  }, [config.view.autoRotate, setView]);

  const toggleAnimation = useCallback(() => {
    setEffects({ animationPlaying: !config.effects.animationPlaying });
  }, [config.effects.animationPlaying, setEffects]);

  const savePreset = useCallback(() => {
    publishAvatarPreset(config);
    void fetch("/api/avatar/preset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "기본", config }),
    }).catch(() => undefined);
    return true;
  }, [config]);

  const loadCloudPreset = useCallback(async () => {
    try {
      const res = await fetch("/api/avatar/preset");
      if (!res.ok) return false;
      const data = (await res.json()) as { preset?: { config?: Partial<AvatarConfig> } };
      if (!data.preset?.config) return false;
      setConfig(mergeStoredConfig(data.preset.config));
      return true;
    } catch {
      return false;
    }
  }, []);

  const loadPreset = useCallback(() => {
    const stored = loadAvatarPresetFromStorage();
    if (stored) setConfig(stored);
    return !!stored;
  }, []);

  const uploadVrm = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".vrm")) return false;
    await saveVrmSlot(file);
    await refreshVrmSlots();
    return true;
  }, [refreshVrmSlots]);

  const selectVrmSlot = useCallback(async (id: string) => {
    await setActiveVrmSlotId(id);
    await refreshVrmSlots();
    notifyVrmSlotChanged();
    return loadVrmSlot(id);
  }, [refreshVrmSlots]);

  const removeVrmSlot = useCallback(async (id: string) => {
    await deleteVrmSlot(id);
    await refreshVrmSlots();
  }, [refreshVrmSlots]);

  const resetVrmModel = useCallback(async () => {
    await clearAllVrmSlots();
    await refreshVrmSlots();
    return true;
  }, [refreshVrmSlots]);

  const exportPresetFile = useCallback(() => exportPresetBlob(config), [config]);

  const importPreset = useCallback(async (file: File) => {
    const next = await importPresetFile(file);
    if (next) setConfig(next);
    return !!next;
  }, []);

  const summary = useMemo(() => {
    const { body, face, outfit, hair, effects, equipped } = config;
    const hairItem = equipped.hairId ? getCatalogItem(equipped.hairId) : undefined;
    return {
      height: `${body.height}cm`,
      weight: `${body.weight}kg`,
      faceShape: getFaceShapeLabel(face.faceShape),
      outfit: outfit.preset,
      hairStyle: hairItem?.name ?? hair.style,
      motion: effects.motion,
      background: effects.background,
    };
  }, [config]);

  return {
    config,
    loaded,
    wishlist,
    shopMsg,
    setShopMsg,
    setStyle,
    setBody,
    setFace,
    setMakeup,
    setSkin,
    setOutfit,
    setHair,
    setEffects,
    setView,
    setPaint,
    setSculpt,
    addPaintStroke,
    clearPaint,
    clearSculpt,
    loadCloudPreset,
    resetView,
    zoomIn,
    zoomOut,
    toggleAutoRotate,
    toggleAnimation,
    savePreset,
    loadPreset,
    uploadVrm,
    selectVrmSlot,
    removeVrmSlot,
    resetVrmModel,
    exportPresetFile,
    importPreset,
    refreshVrmSlots,
    equipCatalogItem,
    toggleWishlist,
    isItemEquipped,
    vrmModelName,
    vrmSlots,
    activeVrmId,
    summary,
  };
}

export type VirtualAvatarStudioState = ReturnType<typeof useVirtualAvatarStudio>;
