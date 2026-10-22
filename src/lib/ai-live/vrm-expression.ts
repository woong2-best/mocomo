import type { VRM } from "@pixiv/three-vrm";

export const VRM_EMOTIONS = ["neutral", "happy", "angry", "sad", "relaxed", "surprised"] as const;

export type VrmEmotion = (typeof VRM_EMOTIONS)[number];

const FACE_EMOTIONS = ["happy", "angry", "sad", "relaxed", "surprised"] as const;

export function parseVrmEmotion(value: unknown): VrmEmotion {
  if (typeof value !== "string") return "neutral";
  const key = value.trim().toLowerCase();
  return (VRM_EMOTIONS as readonly string[]).includes(key) ? (key as VrmEmotion) : "neutral";
}

/** Pull `{ text, emotion }` out of a Gemini JSON reply. Plain text falls back to neutral. */
export function readHostEmotionReply(raw: string): { text: string; emotion: VrmEmotion } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1)) as { text?: unknown; emotion?: unknown };
      const text = typeof parsed.text === "string" ? parsed.text.replace(/\s+/g, " ").trim().slice(0, 240) : "";
      if (text) return { text, emotion: parseVrmEmotion(parsed.emotion) };
    } catch {
      /* model ignored the schema */
    }
  }
  if (trimmed.startsWith("{")) return null;
  const text = trimmed.replace(/\s+/g, " ").slice(0, 240);
  return text ? { text, emotion: "neutral" } : null;
}

function setPreset(em: NonNullable<VRM["expressionManager"]>, name: string, value: number) {
  const expr = em.getExpression(name);
  if (!expr) return;
  // VRoid marks happy/angry as blocking the mouth, which would freeze the lipsync viseme.
  if (value > 0) {
    if (expr.userData.mocoMouthOverride === undefined) {
      expr.userData.mocoMouthOverride = expr.overrideMouth;
    }
    expr.overrideMouth = "none";
  } else if (typeof expr.userData.mocoMouthOverride === "string") {
    expr.overrideMouth = expr.userData.mocoMouthOverride as typeof expr.overrideMouth;
  }
  em.setValue(name, value);
}

/** Raise one face preset to 1 while the line plays. `neutral` clears them. */
export function setVrmEmotion(vrm: VRM | null | undefined, emotion: string) {
  const em = vrm?.expressionManager;
  if (!em) return;
  for (const name of FACE_EMOTIONS) setPreset(em, name, 0);
  const next = parseVrmEmotion(emotion);
  if (next !== "neutral") setPreset(em, next, 1);
}

/**
 * Volume is 0–1 from the analyser.
 * Silence stays closed. Up to 30% is `ih`, up to 60% is `ou`, and the rest is `aa`.
 */
export function mouthFromVolume(level: number): { aa: number; ih: number; ou: number } {
  const volume = Math.min(Math.max(level, 0), 1);
  if (volume <= 0.02) return { aa: 0, ih: 0, ou: 0 };
  if (volume <= 0.3) return { aa: 0, ih: volume, ou: 0 };
  if (volume < 0.6) return { aa: 0, ih: 0, ou: volume };
  return { aa: volume, ih: 0, ou: 0 };
}

export function applyVrmMouth(vrm: VRM | null | undefined, level: number) {
  const em = vrm?.expressionManager;
  if (!em) return;
  const mouth = mouthFromVolume(level);
  setPreset(em, "aa", mouth.aa);
  setPreset(em, "ih", mouth.ih);
  setPreset(em, "ou", mouth.ou);
}
