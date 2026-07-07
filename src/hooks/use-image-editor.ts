"use client";

import { useCallback, useRef, useState } from "react";
import {
  addLayer,
  cloneProject,
  createLayerFromFile,
  duplicateLayer,
  fitLayerToCanvas,
  moveLayer,
  removeLayer,
  setActiveLayer,
  setCrop,
  updateLayer,
} from "@/lib/media-editor/layers";
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
import type { CropRect, EditorLayer, EditorProject, LayerTransform } from "@/lib/media-editor/types";

export function useImageEditor(initialProject: EditorProject | null) {
  const [history, setHistory] = useState<EditorHistory | null>(
    initialProject ? createHistory(initialProject) : null
  );
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const project = history?.present ?? null;

  const commit = useCallback((next: EditorProject) => {
    setHistory((h) => (h ? pushHistory(h, next) : createHistory(next)));
  }, []);

  const commitDebounced = useCallback(
    (next: EditorProject, delayMs = 400) => {
      setHistory((h) => {
        if (!h) return createHistory(next);
        return { ...h, present: cloneProject(next) };
      });
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(() => {
        setHistory((h) => (h ? pushHistory(h, next) : null));
      }, delayMs);
    },
    []
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h) return h;
      const next = undoHistory(h);
      return next ?? h;
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (!h) return h;
      const next = redoHistory(h);
      return next ?? h;
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
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    if (project) commit(project);
  }, [project, commit]);

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
      commit(
        updateLayer(project, layerId, (layer) => ({
          ...layer,
          data: {
            ...layer.data,
            flipX: axis === "x" ? !layer.data.flipX : layer.data.flipX,
            flipY: axis === "y" ? !layer.data.flipY : layer.data.flipY,
          },
        }))
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
        const fitted = fitLayerToCanvas(layer, project.width, project.height);
        next = addLayer(next, fitted);
      }
      commit(next);
    },
    [project, commit]
  );

  const applyCropAspect = useCallback(
    (aspect: number | undefined) => {
      if (!project) return;
      const crop = fitCropRect(project.width, project.height, aspect);
      commit(setCrop(project, crop));
    },
    [project, commit]
  );

  const setCropRect = useCallback(
    (crop: CropRect) => {
      if (!project) return;
      commit(setCrop(project, crop));
    },
    [project, commit]
  );

  const resetHistory = useCallback((next: EditorProject) => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    setHistory(createHistory(next));
  }, []);

  return {
    project,
    history,
    resetHistory,
    undo,
    redo,
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
    setOpacity,
    flipLayer,
    rotateLayer,
    addImageFiles,
    applyCropAspect,
    setCropRect,
    commit,
  };
}
