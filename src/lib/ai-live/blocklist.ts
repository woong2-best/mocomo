import {
  isNangnangCharacter,
  isZelieCharacter,
  NANGNANG_HARD,
  NANGNANG_SNAP,
  ZELIE_HARD_FR,
  ZELIE_HARD_KO,
  ZELIE_SNAP_FR,
  ZELIE_SNAP_KO,
  zelieInputLang,
} from "@/lib/ai-live/speech-lang";

/**
 * First-pass live-host filter. Regex only — callers must not hit an LLM when this matches.
 * Korean literals are unicode escapes so UI catalogs stay free of Hangul source.
 */

const KO_BLOCK =
  /\uBD88\uBC95|\uC695\uC124|\uD1A0\uD1A0|\uC131\uC778|\uC0AC\uAE30|\uC870\uAC74|\uC57C\uB3D9|\uC131\uB9E4\uB9E4|\uB9C8\uC57D|\uB3C4\uBC15|\uCE74\uC9C0\uB178|\uC74C\uB780/;

const EN_BLOCK =
  /\b(?:scam|scams|scammer|scammers|casino|casinos|gambling|porn|pornography|nude|nudes|onlyfans|cocaine|heroin|meth)\b/i;

/** High-signal minor sexual terms. Flat refusal, never a playful reply, never a model call. */
const MINOR_BLOCK =
  /\b(?:loli|lolita|shota|preteen|jailbait|csam|underage)\b|\uB85C\uB9AC|\uC1FC\uD0C0|\uC544\uB3D9\uC74C\uB780|\uC544\uB3D9\uD3EC\uB974\uB178|\uBBF8\uC131\uB144\uC790\uC131/i;

const KO_SNAP = [
  "\uB108 \uBC29\uAE08 \uBB50\uB77C\uACE0 \uD588\uB0D0? \uC774\uC0C1\uD55C \uC18C\uB9AC \uD558\uBA74 \uBC34\uC774\uB2E4!",
  "\uADF8\uB7F0 \uBD88\uBC95\uC801\uC778 \uC598\uAE30\uB294 \uC548 \uBC1B\uC544\uC918. \uCBE7...",
  "...",
];

const EN_SNAP = [
  "What did you just say? One more and you're banned.",
  "I don't take that kind of talk. Tch.",
  "...",
];

const KO_HARD = "\uADF8\uAC74 \uC548 \uB3FC. \uADF8\uB7F0 \uC598\uAE30\uB294 \uC5EC\uAE30\uC11C \uC548 \uD574.";
const EN_HARD = "I won't talk about that.";

export type AiHostBlock = {
  text: string;
  blocked: true;
  hard: boolean;
};

export function textHasHangul(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0xac00 && code <= 0xd7a3) return true;
  }
  return false;
}

function pick(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)] ?? "...";
}

export function angryReply(userText: string, characterId?: string | null): string {
  if (isNangnangCharacter(characterId)) return pick(NANGNANG_SNAP);
  if (isZelieCharacter(characterId)) return pick(zelieInputLang(userText) === "fr" ? ZELIE_SNAP_FR : ZELIE_SNAP_KO);
  return pick(textHasHangul(userText) ? KO_SNAP : EN_SNAP);
}

export function hardRefusal(userText: string, characterId?: string | null): string {
  if (isNangnangCharacter(characterId)) return NANGNANG_HARD;
  if (isZelieCharacter(characterId)) return zelieInputLang(userText) === "fr" ? ZELIE_HARD_FR : ZELIE_HARD_KO;
  return textHasHangul(userText) ? KO_HARD : EN_HARD;
}

/** Null means the line may continue to the model. */
export function classifyAiHostMessage(raw: string, characterId?: string | null): AiHostBlock | null {
  const text = raw.trim();
  if (!text) return null;
  const compact = text.replace(/\s+/g, "");
  if (MINOR_BLOCK.test(text) || MINOR_BLOCK.test(compact)) {
    return { text: hardRefusal(text, characterId), blocked: true, hard: true };
  }
  if (KO_BLOCK.test(compact) || EN_BLOCK.test(text)) {
    return { text: angryReply(text, characterId), blocked: true, hard: false };
  }
  return null;
}

const MAX_INPUT = 500;
const MODEL_INPUT = 200;

export type HostReplyPlan =
  | { kind: "ignore" }
  | { kind: "blocked"; text: string }
  | { kind: "model"; text: string };

/** Regex gate. `blocked` and `ignore` must not call a model or a voice server. */
export function planHostReply(raw: string, characterId?: string | null): HostReplyPlan {
  const text = raw.trim().slice(0, MAX_INPUT);
  if (!text) return { kind: "ignore" };
  const blocked = classifyAiHostMessage(text, characterId);
  if (blocked) return { kind: "blocked", text: blocked.text };
  return { kind: "model", text: text.slice(0, MODEL_INPUT) };
}
