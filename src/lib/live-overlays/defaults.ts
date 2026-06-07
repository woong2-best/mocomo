import type {
  LiveOverlayLotteryProps,
  LiveOverlayState,
  LiveOverlayTextProps,
  LiveOverlayWheelProps,
  LiveOverlayWidget,
  LiveOverlayWidgetType,
} from "@/lib/live-overlays/types";
import { createDefaultWheelProps } from "@/lib/live-overlays/wheel-theme";

export function emptyOverlayState(): LiveOverlayState {
  return { version: 0, widgets: [] };
}

export function storageKey(channelId: string) {
  return `mocomo_live_overlays_${channelId}`;
}

export function loadOverlayStateFromStorage(channelId: string): LiveOverlayState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(channelId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveOverlayState;
    if (!parsed || !Array.isArray(parsed.widgets)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveOverlayStateToStorage(channelId: string, state: LiveOverlayState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(channelId), JSON.stringify(state));
  } catch {
    /* quota */
  }
}

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `ow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const defaultProps: Record<LiveOverlayWidgetType, LiveOverlayWidget["props"]> = {
  text: {
    content: "방송 텍스트",
    fontSize: 28,
    color: "#ffffff",
    background: "rgba(0,0,0,0.55)",
    bold: true,
    align: "center",
  } satisfies LiveOverlayTextProps,
  wheel: createDefaultWheelProps(),
  lottery: {
    title: "추첨",
    entries: ["참가자1", "참가자2", "참가자3"],
    winner: null,
    drawing: false,
    removeWinner: true,
    history: [],
  } satisfies LiveOverlayLotteryProps,
};

const defaultLayout: Record<
  LiveOverlayWidgetType,
  Pick<LiveOverlayWidget, "x" | "y" | "w" | "h">
> = {
  text: { x: 8, y: 72, w: 84, h: 14 },
  wheel: { x: 58, y: 6, w: 36, h: 52 },
  lottery: { x: 8, y: 8, w: 48, h: 42 },
};

export function createOverlayWidget(type: LiveOverlayWidgetType, z: number): LiveOverlayWidget {
  const layout = defaultLayout[type];
  return {
    id: newId(),
    type,
    ...layout,
    z,
    visible: true,
    props: structuredClone(type === "wheel" ? createDefaultWheelProps() : defaultProps[type]),
  };
}

export function pickWeightedSegment(
  segments: LiveOverlayWheelProps["segments"]
): { index: number; label: string } {
  const pool = segments.filter((s) => s.label.trim());
  if (!pool.length) return { index: 0, label: "?" };
  const total = pool.reduce((sum, s) => sum + Math.max(1, s.weight), 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= Math.max(1, pool[i].weight);
    if (r <= 0) {
      const idx = segments.indexOf(pool[i]);
      return { index: idx >= 0 ? idx : i, label: pool[i].label };
    }
  }
  return { index: 0, label: pool[0].label };
}
