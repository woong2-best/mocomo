"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { floodFillCanvas } from "@/lib/avatar-2d/flood-fill";
import {
  drawBrushDot,
  drawBrushLine,
  isDrawingTool,
  stabilizePoint,
  type BrushRuntime,
} from "@/lib/webtoon-studio/brush";
import { applyLayerFilter, drawPageText, drawSpeechBubble, drawSpeedLines, drawScreentone } from "@/lib/webtoon-studio/effects";
import {
  AUTOSAVE_MS,
  createDefaultProject,
  createEmptyPage,
  DEFAULT_BRUSHES,
  HISTORY_MAX,
  STUDIO_RECENT_COLORS_KEY,
  type ScreentonePatternId,
} from "@/lib/webtoon-studio/constants";
import {
  getStudioSettings,
  saveCloudStudioProject,
  syncStudioSettings,
} from "@/actions/webtoon-studio-cloud";
import {
  compositePage,
  duplicateLayer,
  layerCanvas,
  mergePageLayers,
  reorderLayers,
  syncLayerPixels,
} from "@/lib/webtoon-studio/layers";
import { listStudioProjects, saveStudioProject } from "@/lib/webtoon-studio/project-storage";
import type {
  StudioBrushPreset,
  StudioLayer,
  StudioPage,
  StudioProject,
  StudioSelection,
  StudioToolId,
  StudioViewport,
} from "@/lib/webtoon-studio/types";

function loadRecentColors(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STUDIO_RECENT_COLORS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function pushRecentColor(color: string) {
  const next = [color, ...loadRecentColors().filter((c) => c !== color)].slice(0, 12);
  localStorage.setItem(STUDIO_RECENT_COLORS_KEY, JSON.stringify(next));
  return next;
}

export function useWebtoonStudio(initialProject?: StudioProject) {
  const [project, setProject] = useState<StudioProject>(initialProject ?? createDefaultProject());
  const [tool, setTool] = useState<StudioToolId>("gpen");
  const [color, setColor] = useState("#111111");
  const [recentColors, setRecentColors] = useState<string[]>(() => loadRecentColors());
  const [brush, setBrush] = useState<StudioBrushPreset>(DEFAULT_BRUSHES[1]!);
  const [customBrushes, setCustomBrushes] = useState<StudioBrushPreset[]>([]);
  const [viewport, setViewport] = useState<StudioViewport>({ zoom: 0.35, panX: 40, panY: 24 });
  const [selection, setSelection] = useState<StudioSelection>(null);
  const [history, setHistory] = useState<StudioProject[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedProjects, setSavedProjects] = useState<StudioProject[]>([]);
  const [speechTemplate, setSpeechTemplate] = useState<"normal" | "think" | "shout">("normal");
  const [showGuides, setShowGuides] = useState(true);
  const [screentonePattern, setScreentonePattern] = useState<ScreentonePatternId>("dots");
  const [savedPalette, setSavedPalette] = useState<string[]>([]);

  const layerCanvasRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const stabRef = useRef<{ x: number; y: number }[]>([]);
  const rulerStartRef = useRef<{ x: number; y: number } | null>(null);
  const rulerEndRef = useRef<{ x: number; y: number } | null>(null);
  const selectStartRef = useRef<{ x: number; y: number } | null>(null);
  const lassoPointsRef = useRef<{ x: number; y: number }[]>([]);

  const page = project.pages[project.activePageIndex]!;

  const brushRuntime: BrushRuntime = useMemo(
    () => ({
      tool: brush.tool,
      size: brush.size,
      opacity: brush.opacity,
      spacing: brush.spacing,
      hardness: brush.hardness,
      pressure: brush.pressure,
      stabilization: brush.stabilization,
    }),
    [brush]
  );

  const activeLayer = page.layers.find((l) => l.id === page.activeLayerId) ?? page.layers[0]!;

  const getLayerCanvas = useCallback(
    (layer: StudioLayer) => {
      let c = layerCanvasRef.current.get(layer.id);
      if (!c) {
        c = layerCanvas(layer, page.width, page.height);
        layerCanvasRef.current.set(layer.id, c);
      }
      return c;
    },
    [page.height, page.width]
  );

  const invalidateLayerCache = useCallback((layerId: string) => {
    layerCanvasRef.current.delete(layerId);
  }, []);

  const commitProject = useCallback(
    (next: StudioProject, pushHist = true) => {
      setProject(next);
      if (pushHist) {
        setHistory((h) => {
          const slice = h.slice(0, historyIndex + 1);
          slice.push(next);
          if (slice.length > HISTORY_MAX) slice.shift();
          setHistoryIndex(slice.length - 1);
          return slice;
        });
      }
    },
    [historyIndex]
  );

  const updatePage = useCallback(
    (patch: Partial<StudioPage> | ((p: StudioPage) => StudioPage), pushHist = true) => {
      setProject((prev) => {
        const pages = [...prev.pages];
        const idx = prev.activePageIndex;
        const cur = pages[idx]!;
        pages[idx] = typeof patch === "function" ? patch(cur) : { ...cur, ...patch };
        const next = { ...prev, pages, updatedAt: new Date().toISOString() };
        if (pushHist) {
          setHistory((h) => {
            const slice = h.slice(0, historyIndex + 1);
            slice.push(next);
            if (slice.length > HISTORY_MAX) slice.shift();
            setHistoryIndex(slice.length - 1);
            return slice;
          });
        }
        return next;
      });
    },
    [historyIndex]
  );

  const syncActiveLayerFromCanvas = useCallback(() => {
    const lc = getLayerCanvas(activeLayer);
    updatePage((p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === activeLayer.id ? syncLayerPixels(l, lc) : l)),
    }));
  }, [activeLayer, getLayerCanvas, updatePage]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    const snap = history[idx];
    if (!snap) return;
    layerCanvasRef.current.clear();
    setHistoryIndex(idx);
    setProject(snap);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    const snap = history[idx];
    if (!snap) return;
    layerCanvasRef.current.clear();
    setHistoryIndex(idx);
    setProject(snap);
  }, [history, historyIndex]);

  useEffect(() => {
    setHistory([project]);
    setHistoryIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      void saveStudioProject(project);
    }, AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [project]);

  useEffect(() => {
    void getStudioSettings().then((s) => {
      if (s.brushes.length > 0) setCustomBrushes(s.brushes);
      if (s.palette.length > 0) setSavedPalette(s.palette);
    });
  }, []);

  useEffect(() => {
    if (customBrushes.length === 0 && savedPalette.length === 0) return;
    void syncStudioSettings({ brushes: customBrushes, palette: savedPalette });
  }, [customBrushes, savedPalette]);

  useEffect(() => {
    void listStudioProjects().then(setSavedProjects);
  }, [project.updatedAt]);

  const addDialogue = useCallback(
    (speaker: string, text: string) => {
      commitProject({
        ...project,
        dialogues: [
          ...(project.dialogues ?? []),
          {
            id: crypto.randomUUID(),
            pageId: page.id,
            speaker,
            text,
            x: 120,
            y: 120,
          },
        ],
      });
    },
    [commitProject, page.id, project]
  );

  const updateDialogue = useCallback(
    (id: string, patch: Partial<{ speaker: string; text: string }>) => {
      commitProject(
        {
          ...project,
          dialogues: (project.dialogues ?? []).map((d) => (d.id === id ? { ...d, ...patch } : d)),
        },
        false
      );
    },
    [commitProject, project]
  );

  const removeDialogue = useCallback(
    (id: string) => {
      commitProject({
        ...project,
        dialogues: (project.dialogues ?? []).filter((d) => d.id !== id),
      });
    },
    [commitProject, project]
  );

  const saveCloud = useCallback(async () => {
    const payload = { ...project, dialogues: project.dialogues ?? [] };
    const res = await saveCloudStudioProject(payload);
    if (res.cloudId) {
      setProject((p) => ({ ...p, cloudId: res.cloudId }));
    }
    await saveStudioProject(payload);
    const list = await listStudioProjects();
    setSavedProjects(list);
  }, [project]);

  const savePaletteColor = useCallback((c: string) => {
    setSavedPalette((prev) => [c, ...prev.filter((x) => x !== c)].slice(0, 16));
  }, []);

  const pickColor = useCallback((c: string) => {
    setColor(c);
    setRecentColors(pushRecentColor(c));
  }, []);

  const addLayer = useCallback(() => {
    const id = crypto.randomUUID();
    updatePage((p) => ({
      ...p,
      activeLayerId: id,
      layers: [
        ...p.layers,
        {
          id,
          name: `레이어 ${p.layers.length + 1}`,
          type: "raster",
          visible: true,
          locked: false,
          alphaLock: false,
          clipping: false,
          opacity: 1,
          blendMode: "source-over",
          pixels: null,
        },
      ],
    }));
  }, [updatePage]);

  const deleteLayer = useCallback(
    (id: string) => {
      updatePage((p) => {
        if (p.layers.length <= 1) return p;
        const layers = p.layers.filter((l) => l.id !== id);
        invalidateLayerCache(id);
        return {
          ...p,
          layers,
          activeLayerId: p.activeLayerId === id ? layers[layers.length - 1]!.id : p.activeLayerId,
        };
      });
    },
    [invalidateLayerCache, updatePage]
  );

  const duplicateActiveLayer = useCallback(() => {
    const lc = getLayerCanvas(activeLayer);
    const dup = duplicateLayer(syncLayerPixels(activeLayer, lc));
    updatePage((p) => ({
      ...p,
      activeLayerId: dup.id,
      layers: [...p.layers, dup],
    }));
  }, [activeLayer, getLayerCanvas, updatePage]);

  const mergeSelectedLayers = useCallback(() => {
    updatePage((p) => mergePageLayers(p, p.layers.slice(-2).map((l) => l.id)));
  }, [updatePage]);

  const moveLayer = useCallback(
    (from: number, to: number) => {
      updatePage((p) => reorderLayers(p, from, to));
    },
    [updatePage]
  );

  const setLayerOpacity = useCallback(
    (id: string, opacity: number) => {
      updatePage((p) => ({
        ...p,
        layers: p.layers.map((l) => (l.id === id ? { ...l, opacity } : l)),
      }));
    },
    [updatePage]
  );

  const toggleLayerFlag = useCallback(
    (id: string, key: "visible" | "locked" | "alphaLock") => {
      updatePage((p) => ({
        ...p,
        layers: p.layers.map((l) => (l.id === id ? { ...l, [key]: !l[key] } : l)),
      }));
    },
    [updatePage]
  );

  const renameLayer = useCallback(
    (id: string, name: string) => {
      updatePage((p) => ({
        ...p,
        layers: p.layers.map((l) => (l.id === id ? { ...l, name } : l)),
      }));
    },
    [updatePage]
  );

  const addPage = useCallback(() => {
    commitProject({
      ...project,
      pages: [...project.pages, createEmptyPage(`${project.pages.length + 1}페이지`, project.pages.length)],
      activePageIndex: project.pages.length,
      updatedAt: new Date().toISOString(),
    });
    layerCanvasRef.current.clear();
  }, [commitProject, project]);

  const exportMergedPngBlob = useCallback(async (): Promise<Blob> => {
    const totalH = project.pages.reduce((a, p) => a + p.height, 0);
    const w = project.pages[0]?.width ?? 800;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = totalH;
    const ctx = out.getContext("2d")!;
    let y = 0;
    for (const pg of project.pages) {
      const comp = compositePage(pg);
      ctx.drawImage(comp, 0, y);
      y += pg.height;
    }
    return new Promise((resolve, reject) => {
      out.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), "image/png");
    });
  }, [project.pages]);

  const applyFilterToActive = useCallback(
    (filterId: string) => {
      const lc = getLayerCanvas(activeLayer);
      const ctx = lc.getContext("2d")!;
      applyLayerFilter(ctx, filterId, page.width, page.height);
      syncActiveLayerFromCanvas();
    },
    [activeLayer, getLayerCanvas, page.width, page.height, syncActiveLayerFromCanvas]
  );

  const importImageToActive = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const lc = getLayerCanvas(activeLayer);
        const ctx = lc.getContext("2d")!;
        ctx.drawImage(img, 0, 0, page.width, Math.min(page.height, page.width * (img.height / img.width)));
        URL.revokeObjectURL(url);
        syncActiveLayerFromCanvas();
      };
      img.src = url;
    },
    [activeLayer, getLayerCanvas, page.height, page.width, syncActiveLayerFromCanvas]
  );

  const pointerDown = useCallback(
    (x: number, y: number, pressure: number, shiftKey: boolean) => {
      const lc = getLayerCanvas(activeLayer);
      const ctx = lc.getContext("2d")!;
      if (activeLayer.locked) return;

      if (tool === "eyedropper") {
        const comp = compositePage(page);
        const cctx = comp.getContext("2d")!;
        const d = cctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        pickColor(`#${[d[0], d[1], d[2]].map((v) => v!.toString(16).padStart(2, "0")).join("")}`);
        return;
      }

      if (tool === "fill" || tool === "bucket") {
        const rgba = [
          parseInt(color.slice(1, 3), 16),
          parseInt(color.slice(3, 5), 16),
          parseInt(color.slice(5, 7), 16),
          Math.round((brush.opacity / 100) * 255),
        ] as [number, number, number, number];
        floodFillCanvas(ctx, x, y, rgba, 36);
        syncActiveLayerFromCanvas();
        return;
      }

      if (tool === "rectSelect" || tool === "ellipseSelect") {
        selectStartRef.current = { x, y };
        return;
      }

      if (tool === "lassoSelect") {
        lassoPointsRef.current = [{ x, y }];
        selectStartRef.current = { x, y };
        return;
      }

      if (tool === "screentone") {
        drawScreentone(ctx, screentonePattern, x - 120, y - 120, 240, 240);
        syncActiveLayerFromCanvas();
        return;
      }

      if (tool === "text") {
        const text = window.prompt("텍스트 입력", "대사");
        if (text) drawPageText(ctx, text, x, y, 28);
        syncActiveLayerFromCanvas();
        return;
      }

      if (tool === "speechBubble") {
        drawSpeechBubble(ctx, speechTemplate, x - 80, y - 50, 160, 90);
        syncActiveLayerFromCanvas();
        return;
      }

      if (tool === "speedLines") {
        drawSpeedLines(ctx, x, y, 180);
        syncActiveLayerFromCanvas();
        return;
      }

      if (tool === "ruler" || (shiftKey && isDrawingTool(tool))) {
        rulerStartRef.current = { x, y };
        rulerEndRef.current = { x, y };
        drawingRef.current = true;
        return;
      }

      if (!isDrawingTool(tool)) return;

      drawingRef.current = true;
      stabRef.current = [];
      const pt = stabilizePoint(stabRef.current, x, y, brush.stabilization);
      lastPointRef.current = pt;
      drawBrushDot(ctx, pt.x, pt.y, tool, color, brushRuntime, pressure);
    },
    [
      activeLayer,
      brush.opacity,
      brush.stabilization,
      brushRuntime,
      color,
      getLayerCanvas,
      page,
      pickColor,
      speechTemplate,
      screentonePattern,
      syncActiveLayerFromCanvas,
      tool,
    ]
  );

  const pointerMove = useCallback(
    (x: number, y: number, pressure: number) => {
      if (tool === "rectSelect" && selectStartRef.current) {
        const s = selectStartRef.current;
        setSelection({
          x: Math.min(s.x, x),
          y: Math.min(s.y, y),
          w: Math.abs(x - s.x),
          h: Math.abs(y - s.y),
        });
        return;
      }

      if (tool === "ellipseSelect" && selectStartRef.current) {
        const s = selectStartRef.current;
        const rx = Math.abs(x - s.x);
        const ry = Math.abs(y - s.y);
        setSelection({
          x: s.x - rx,
          y: s.y - ry,
          w: rx * 2,
          h: ry * 2,
        });
        return;
      }

      if (tool === "lassoSelect" && selectStartRef.current) {
        lassoPointsRef.current.push({ x, y });
        const pts = lassoPointsRef.current;
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        setSelection({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
        return;
      }

      if (tool === "ruler" && rulerStartRef.current) {
        rulerEndRef.current = { x, y };
        return;
      }

      if (!drawingRef.current || !lastPointRef.current) return;
      const lc = getLayerCanvas(activeLayer);
      const ctx = lc.getContext("2d")!;
      const stab = stabilizePoint(stabRef.current, x, y, brush.stabilization);
      stabRef.current.push(stab);

      const from = lastPointRef.current;
      const to = stab;

      drawBrushLine(ctx, from.x, from.y, to.x, to.y, tool, color, brushRuntime, pressure);
      lastPointRef.current = to;
    },
    [activeLayer, brush.stabilization, brushRuntime, color, getLayerCanvas, tool]
  );

  const pointerUp = useCallback(
    (x?: number, y?: number) => {
      if (tool === "ruler" && rulerStartRef.current) {
        const end = rulerEndRef.current ?? (x != null && y != null ? { x, y } : null);
        if (end) {
          const lc = getLayerCanvas(activeLayer);
          const ctx = lc.getContext("2d")!;
          drawBrushLine(
            ctx,
            rulerStartRef.current.x,
            rulerStartRef.current.y,
            end.x,
            end.y,
            tool,
            color,
            brushRuntime,
            1
          );
          syncActiveLayerFromCanvas();
        }
        rulerStartRef.current = null;
        rulerEndRef.current = null;
        drawingRef.current = false;
        return;
      }

      if (selectStartRef.current) {
        selectStartRef.current = null;
        lassoPointsRef.current = [];
        return;
      }
      if (drawingRef.current) {
        drawingRef.current = false;
        lastPointRef.current = null;
        syncActiveLayerFromCanvas();
      }
    },
    [activeLayer, brushRuntime, color, getLayerCanvas, syncActiveLayerFromCanvas, tool]
  );

  const saveProjectNow = useCallback(async () => {
    await saveStudioProject(project);
    const list = await listStudioProjects();
    setSavedProjects(list);
  }, [project]);

  const loadProject = useCallback((p: StudioProject) => {
    layerCanvasRef.current.clear();
    const normalized = {
      ...p,
      dialogues: p.dialogues ?? [],
      pages: p.pages.map((pg) => ({
        ...pg,
        layers: pg.layers.map((l) => ({ ...l })),
      })),
    };
    setProject(normalized);
    setHistory([normalized]);
    setHistoryIndex(0);
  }, []);

  const createCustomBrush = useCallback(() => {
    const name = window.prompt("브러시 이름", "내 브러시");
    if (!name) return;
    setCustomBrushes((b) => [
      ...b,
      { ...brush, id: crypto.randomUUID(), name, group: "custom" },
    ]);
  }, [brush]);

  const liveComposite = useCallback(() => {
    const out = document.createElement("canvas");
    out.width = page.width;
    out.height = page.height;
    const ctx = out.getContext("2d")!;
    for (const layer of page.layers) {
      if (!layer.visible || layer.type !== "raster") continue;
      const lc = getLayerCanvas(layer);
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(lc, 0, 0);
      ctx.restore();
    }
    return out;
  }, [getLayerCanvas, page]);

  return {
    project,
    page,
    tool,
    setTool,
    color,
    pickColor,
    recentColors,
    brush,
    setBrush,
    customBrushes,
    createCustomBrush,
    viewport,
    setViewport,
    selection,
    setSelection,
    activeLayer,
    setActiveLayerId: (id: string) => updatePage({ activeLayerId: id }, false),
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    addLayer,
    deleteLayer,
    duplicateActiveLayer,
    mergeSelectedLayers,
    moveLayer,
    setLayerOpacity,
    toggleLayerFlag,
    renameLayer,
    addPage,
    setActivePageIndex: (i: number) => {
      layerCanvasRef.current.clear();
      commitProject({ ...project, activePageIndex: i }, false);
    },
    exportMergedPngBlob,
    applyFilterToActive,
    importImageToActive,
    pointerDown,
    pointerMove,
    pointerUp,
    getLayerCanvas,
    compositePage,
    liveComposite,
    saveProjectNow,
    loadProject,
    savedProjects,
    speechTemplate,
    setSpeechTemplate,
    showGuides,
    setShowGuides,
    screentonePattern,
    setScreentonePattern,
    savedPalette,
    savePaletteColor,
    addDialogue,
    updateDialogue,
    removeDialogue,
    saveCloud,
    renameProject: (name: string) => commitProject({ ...project, name }, false),
    duplicateProject: () => {
      const copy = {
        ...project,
        id: crypto.randomUUID(),
        name: `${project.name} (복사)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      loadProject(copy);
    },
  };
}

export type WebtoonStudioState = ReturnType<typeof useWebtoonStudio>;
