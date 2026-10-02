import type {
  LiveOverlayState,
  LiveOverlayTextProps,
  LiveOverlayWidget,
  LiveOverlayWidgetType,
} from "@/lib/live-overlays/types";

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
    content: "Broadcast text",
    fontSize: 28,
    color: "#ffffff",
    background: "rgba(0,0,0,0.55)",
    bold: true,
    align: "center",
  } satisfies LiveOverlayTextProps,
};

const defaultLayout: Record<
  LiveOverlayWidgetType,
  Pick<LiveOverlayWidget, "x" | "y" | "w" | "h">
> = {
  text: { x: 8, y: 72, w: 84, h: 14 },
};

export function createOverlayWidget(type: LiveOverlayWidgetType, z: number): LiveOverlayWidget {
  const layout = defaultLayout[type];
  return {
    id: newId(),
    type,
    ...layout,
    z,
    visible: true,
    props: structuredClone(defaultProps[type]),
  };
}

/** Saved state may still hold removed game widgets (wheel, quiz, …); keep text only. */
export function normalizeOverlayState(state: LiveOverlayState): LiveOverlayState {
  return {
    ...state,
    widgets: state.widgets.filter((w) => (w.type as string) === "text"),
  };
}
