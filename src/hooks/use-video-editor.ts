"use client";

import { useCallback, useState } from "react";
import {
  cloneVideoEdit,
  DEFAULT_VIDEO_EDIT,
  type VideoEditState,
  videoEditEquals,
} from "@/lib/video-editor/types";

const MAX_HISTORY = 40;

export function useVideoEditor() {
  const [edit, setEdit] = useState<VideoEditState>(() => cloneVideoEdit(DEFAULT_VIDEO_EDIT));
  const [past, setPast] = useState<VideoEditState[]>([]);
  const [future, setFuture] = useState<VideoEditState[]>([]);

  const applyEdit = useCallback((next: VideoEditState, recordHistory: boolean) => {
    setEdit((cur) => {
      if (videoEditEquals(cur, next)) return cur;
      if (recordHistory) {
        setPast((p) => [...p.slice(-MAX_HISTORY + 1), cloneVideoEdit(cur)]);
        setFuture([]);
      }
      return cloneVideoEdit(next);
    });
  }, []);

  const patch = useCallback(
    (patchFn: (s: VideoEditState) => VideoEditState, recordHistory = true) => {
      setEdit((cur) => {
        const next = patchFn(cur);
        if (videoEditEquals(cur, next)) return cur;
        if (recordHistory) {
          setPast((p) => [...p.slice(-MAX_HISTORY + 1), cloneVideoEdit(cur)]);
          setFuture([]);
        }
        return cloneVideoEdit(next);
      });
    },
    []
  );

  const patchLive = useCallback((patchFn: (s: VideoEditState) => VideoEditState) => {
    setEdit((cur) => cloneVideoEdit(patchFn(cur)));
  }, []);

  const commitLive = useCallback(() => {
    setEdit((cur) => {
      setPast((p) => {
        const last = p[p.length - 1];
        if (last && videoEditEquals(last, cur)) return p;
        return [...p.slice(-MAX_HISTORY + 1), cloneVideoEdit(cur)];
      });
      setFuture([]);
      return cur;
    });
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1]!;
      setEdit((cur) => {
        setFuture((f) => [cloneVideoEdit(cur), ...f]);
        return cloneVideoEdit(prev);
      });
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0]!;
      setEdit((cur) => {
        setPast((p) => [...p, cloneVideoEdit(cur)]);
        return cloneVideoEdit(next);
      });
      return f.slice(1);
    });
  }, []);

  const reset = useCallback((duration: number, maxDurationSec: number) => {
    setPast([]);
    setFuture([]);
    setEdit({
      ...cloneVideoEdit(DEFAULT_VIDEO_EDIT),
      endSec: Math.min(duration, maxDurationSec),
    });
  }, []);

  return {
    edit,
    patch,
    patchLive,
    commitLive,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}

export function needsVideoReencode(edit: VideoEditState, duration: number): boolean {
  const fullClip = edit.startSec < 0.05 && edit.endSec >= duration - 0.05;
  return (
    !fullClip ||
    edit.rotation !== 0 ||
    edit.flipX ||
    edit.flipY ||
    edit.cropAspect !== undefined ||
    edit.filterId !== "none" ||
    edit.brightness !== 0 ||
    edit.contrast !== 0 ||
    edit.saturation !== 0 ||
    edit.stickers.length > 0 ||
    edit.volume !== 1 ||
    edit.muted
  );
}
