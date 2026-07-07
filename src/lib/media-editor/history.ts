import { cloneProject } from "@/lib/media-editor/layers";
import type { EditorProject } from "@/lib/media-editor/types";

export const MAX_EDITOR_HISTORY = 50;

export type EditorHistory = {
  past: EditorProject[];
  present: EditorProject;
  future: EditorProject[];
};

export function createHistory(project: EditorProject): EditorHistory {
  return { past: [], present: cloneProject(project), future: [] };
}

export function pushHistory(history: EditorHistory, next: EditorProject): EditorHistory {
  const present = cloneProject(next);
  let past = [...history.past, cloneProject(history.present)];
  if (past.length > MAX_EDITOR_HISTORY) {
    past = past.slice(past.length - MAX_EDITOR_HISTORY);
  }
  return { past, present, future: [] };
}

export function undoHistory(history: EditorHistory): EditorHistory | null {
  if (history.past.length === 0) return null;
  const previous = history.past.at(-1)!;
  const past = history.past.slice(0, -1);
  const future = [cloneProject(history.present), ...history.future];
  return { past, present: cloneProject(previous), future };
}

export function redoHistory(history: EditorHistory): EditorHistory | null {
  if (history.future.length === 0) return null;
  const next = history.future[0]!;
  const future = history.future.slice(1);
  const past = [...history.past, cloneProject(history.present)];
  return { past, present: cloneProject(next), future };
}

export function canUndo(history: EditorHistory): boolean {
  return history.past.length > 0;
}

export function canRedo(history: EditorHistory): boolean {
  return history.future.length > 0;
}
