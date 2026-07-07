"use client";

import { useCallback, useRef, useState } from "react";
import {
  addLayer,
  appendBrushStroke,
  cloneProject,
  createBlurLayer,
  createBrushLayer,
  createEmojiLayer,
  createLayerFromFile,
  createOverlayLayer,
  createShapeLayer,
  createStickerLayer,
  createTextLayer,
  duplicateLayer,
  fitLayerToCanvas,
  groupLayers,
  moveLayer,
  bringLayerToFront,
  sendLayerToBack,
  removeLayer,
  renameLayer,
  setActiveLayer,
  setCrop,
  updateLayer,
} from "@/lib/media-editor/layers";
import { alignLayer, type AlignMode } from "@/lib/media-editor/alignment";
import { patchImageEffects } from "@/lib/media-editor/effects";
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type EditorHistory,
} from "@/lib/media-editor/history";
import { fitCropRect } from "@/lib/media-editor/crop-presets";
import { saveEditorProject } from "@/lib/media-editor/project-storage";
import type {
  BrushStroke,
  EditorLayer,
  EditorProject,
  EditorToolId,
  ImageEffects,
  LayerTransform,
  SavedEditorProject,
  ShapeKind,
} from "@/lib/media-editor/types";
import { hasFlip } from "@/lib/media-editor/types";
import type { StickerItem } from "@/lib/media-editor/stickers";
import { DEFAULT_BRUSH } from "@/lib/media-editor/constants";

export function useImageEditor(initialProject: EditorProject | null) {
  const [history, setHistory] = useState<EditorHistory | null>(
    initialProject ? createHistory(initialProject) : null
  );
  const [activeTool, setActiveTool] = useState<EditorToolId>("select");
  const [brushSettings, setBrushSettings] = useState(DEFAULT_BRUSH);
  const [activeBrushLayerId, setActiveBrushLayerId] = useState<string | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const project = history?.present ?? null;

  const commit = useCallback((next: EditorProject) => {
    setHistory((h) => (h ? pushHistory(h, next) : createHistory(next)));
  }, []);

  const commitDebounced = useCallback((next: EditorProject, delayMs = 400) => {
    setHistory((h) => {
      if (!h) return createHistory(next);
      return { ...h, present: cloneProject(next) };
    });
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      commitTimer.current = null;
      setHistory((h) => (h ? pushHistory(h, h.present) : null));
    }, delayMs);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h) return h;
      return undoHistory(h) ?? h;
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (!h) return h;
      return redoHistory(h) ?? h;
    });
  }, []);

  const jumpToHistory = useCallback((index: number) => {
    setHistory((h) => {
      if (!h) return h;
      const all = [...h.past, h.present, ...h.future];
      const target = all[index];
      if (!target) return h;
      const past = all.slice(0, index);
      const future = all.slice(index + 1);
      return { past, present: cloneProject(target), future };
    });
  }, []);

  const selectLayer = useCallback(
    (layerId: string | null) => {
      if (!project) return;
      commit(setActiveLayer(project, layerId));
    },
    [project, commit]
  );

  const patchLayer = useCallback(
    (layerId: string, patch: Partial<EditorLayer> | ((layer: EditorLayer) => EditorLayer)) => {
      if (!project) return;
      commit(updateLayer(project, layerId, patch));
    },
    [project, commit]
  );

  const transformLayer = useCallback(
    (layerId: string, transform: Partial<LayerTransform>, debounced = true) => {
      if (!project) return;
      const next = updateLayer(project, layerId, (layer) => ({
        ...layer,
        transform: { ...layer.transform, ...transform },
      }));
      if (debounced) commitDebounced(next);
      else commit(next);
    },
    [project, commit, commitDebounced]
  );

  const flushTransform = useCallback(() => {
    if (!commitTimer.current) return;
    clearTimeout(commitTimer.current);
    commitTimer.current = null;
    setHistory((h) => {
      if (!h) return h;
      return pushHistory(h, h.present);
    });
  }, []);

  const toggleVisible = useCallback(
    (layerId: string) => {
      if (!project) return;
      const layer = project.layers.find((l) => l.id === layerId);
      if (!layer) return;
      commit(updateLayer(project, layerId, { visible: !layer.visible }));
    },
    [project, commit]
  );

  const toggleLocked = useCallback(
    (layerId: string) => {
      if (!project) return;
      const layer = project.layers.find((l) => l.id === layerId);
      if (!layer) return;
      commit(updateLayer(project, layerId, { locked: !layer.locked }));
    },
    [project, commit]
  );

  const deleteLayer = useCallback(
    (layerId: string) => {
      if (!project) return;
      if (project.layers.length <= 1) return;
      commit(removeLayer(project, layerId));
    },
    [project, commit]
  );

  const dupLayer = useCallback(
    (layerId: string) => {
      if (!project) return;
      commit(duplicateLayer(project, layerId));
    },
    [project, commit]
  );

  const moveLayerOrder = useCallback(
    (layerId: string, direction: "up" | "down") => {
      if (!project) return;
      commit(moveLayer(project, layerId, direction));
    },
    [project, commit]
  );

  const bringToFront = useCallback(
    (layerId: string) => {
      if (!project) return;
      commit(bringLayerToFront(project, layerId));
    },
    [project, commit]
  );

  const sendToBack = useCallback(
    (layerId: string) => {
      if (!project) return;
      commit(sendLayerToBack(project, layerId));
    },
    [project, commit]
  );

  const setOpacity = useCallback(
    (layerId: string, opacity: number) => {
      if (!project) return;
      commitDebounced(updateLayer(project, layerId, { opacity }));
    },
    [project, commitDebounced]
  );

  const flipLayer = useCallback(
    (layerId: string, axis: "x" | "y") => {
      if (!project) return;
      const layer = project.layers.find((l) => l.id === layerId);
      if (!layer || !hasFlip(layer)) return;
      commit(
        updateLayer(project, layerId, (l) => {
          if (!hasFlip(l)) return l;
          return {
            ...l,
            data: {
              ...l.data,
              flipX: axis === "x" ? !l.data.flipX : l.data.flipX,
              flipY: axis === "y" ? !l.data.flipY : l.data.flipY,
            },
          };
        })
      );
    },
    [project, commit]
  );

  const rotateLayer = useCallback(
    (layerId: string, degrees: number) => {
      if (!project) return;
      const layer = project.layers.find((l) => l.id === layerId);
      if (!layer) return;
      transformLayer(layerId, { rotation: layer.transform.rotation + degrees }, false);
    },
    [project, transformLayer]
  );

  const addImageFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!project) return;
      let next = project;
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const layer = await createLayerFromFile(file);
        next = addLayer(next, fitLayerToCanvas(layer, project.width, project.height));
      }
      commit(next);
    },
    [project, commit]
  );

  const addTextLayer = useCallback(() => {
    if (!project) return;
    commit(addLayer(project, createTextLayer()));
  }, [project, commit]);

  const addEmojiLayer = useCallback(
    (emoji: string) => {
      if (!project) return;
      commit(addLayer(project, createEmojiLayer(emoji)));
    },
    [project, commit]
  );

  const addSticker = useCallback(
    (item: StickerItem) => {
      if (!project) return;
      commit(addLayer(project, createStickerLayer(item)));
    },
    [project, commit]
  );

  const addShape = useCallback(
    (kind: ShapeKind) => {
      if (!project) return;
      commit(addLayer(project, createShapeLayer(kind)));
    },
    [project, commit]
  );

  const addBlurOverlay = useCallback(() => {
    if (!project) return;
    const w = project.crop.width * 0.4;
    const h = project.crop.height * 0.25;
    commit(addLayer(project, createBlurLayer(w, h, project.crop.x + 20, project.crop.y + 20)));
  }, [project, commit]);

  const addColorOverlay = useCallback(() => {
    if (!project) return;
    commit(
      addLayer(
        project,
        createOverlayLayer(project.crop.width, project.crop.height, project.crop.x, project.crop.y)
      )
    );
  }, [project, commit]);

  const ensureBrushLayer = useCallback((): string => {
    if (!project) return "";
    if (activeBrushLayerId) {
      const exists = project.layers.some((l) => l.id === activeBrushLayerId);
      if (exists) return activeBrushLayerId;
    }
    const layer = createBrushLayer();
    commit(addLayer(project, layer));
    setActiveBrushLayerId(layer.id);
    return layer.id;
  }, [project, activeBrushLayerId, commit]);

  const addBrushStroke = useCallback(
    (layerId: string, stroke: BrushStroke) => {
      if (!project) return;
      commit(appendBrushStroke(project, layerId, stroke));
    },
    [project, commit]
  );

  const setImageEffects = useCallback(
    (layerId: string, patch: Partial<ImageEffects>) => {
      if (!project) return;
      commit(
        updateLayer(project, layerId, (layer) => {
          if (layer.type !== "background" && layer.type !== "image") return layer;
          return patchImageEffects(layer, patch);
        })
      );
    },
    [project, commit]
  );

  const alignActive = useCallback(
    (mode: AlignMode) => {
      if (!project?.activeLayerId) return;
      commit(alignLayer(project, project.activeLayerId, mode));
    },
    [project, commit]
  );

  const applyCropAspect = useCallback(
    (aspect: number | undefined) => {
      if (!project) return;
      commit(setCrop(project, fitCropRect(project.width, project.height, aspect)));
    },
    [project, commit]
  );

  const toggleSnap = useCallback(() => {
    if (!project) return;
    commit({ ...project, snapEnabled: !project.snapEnabled });
  }, [project, commit]);

  const toggleGuides = useCallback(() => {
    if (!project) return;
    commit({ ...project, showGuides: !project.showGuides });
  }, [project, commit]);

  const groupSelected = useCallback(() => {
    if (!project?.activeLayerId) return;
    commit(groupLayers(project, [project.activeLayerId]));
  }, [project, commit]);

  const renameActiveLayer = useCallback(
    (name: string) => {
      if (!project?.activeLayerId) return;
      commit(renameLayer(project, project.activeLayerId, name));
    },
    [project, commit]
  );

  const autosave = useCallback(async (thumbDataUrl?: string) => {
    if (!project) return;
    const saved: SavedEditorProject = { ...cloneProject(project), thumbDataUrl };
    await saveEditorProject(saved);
  }, [project]);

  const loadProject = useCallback((next: EditorProject) => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    setHistory(createHistory(next));
    setActiveBrushLayerId(null);
  }, []);

  const resetHistory = useCallback((next: EditorProject) => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    setHistory(createHistory(next));
    setActiveBrushLayerId(null);
  }, []);

  const historyItems = history ? [...history.past, history.present, ...history.future] : [];
  const historyIndex = history ? history.past.length : 0;

  return {
    project,
    history,
    historyItems,
    historyIndex,
    activeTool,
    setActiveTool,
    brushSettings,
    setBrushSettings,
    activeBrushLayerId,
    resetHistory,
    loadProject,
    undo,
    redo,
    jumpToHistory,
    canUndo: history ? canUndo(history) : false,
    canRedo: history ? canRedo(history) : false,
    selectLayer,
    patchLayer,
    transformLayer,
    flushTransform,
    toggleVisible,
    toggleLocked,
    deleteLayer,
    dupLayer,
    moveLayerOrder,
    bringToFront,
    sendToBack,
    setOpacity,
    flipLayer,
    rotateLayer,
    addImageFiles,
    addTextLayer,
    addEmojiLayer,
    addSticker,
    addShape,
    addBlurOverlay,
    addColorOverlay,
    ensureBrushLayer,
    addBrushStroke,
    setImageEffects,
    alignActive,
    applyCropAspect,
    toggleSnap,
    toggleGuides,
    groupSelected,
    renameActiveLayer,
    autosave,
    commit,
  };
}
