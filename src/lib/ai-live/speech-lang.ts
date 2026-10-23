export type SpeechLang = "ko" | "en" | "ja";

function hasKana(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x3040 && code <= 0x30ff) return true;
  }
  return false;
}

function hasHangul(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0xac00 && code <= 0xd7a3) return true;
  }
  return false;
}

/** Korean if the line has Hangul, Japanese if it has kana, otherwise English. */
export function speechLangForText(text: string): SpeechLang {
  if (hasHangul(text)) return "ko";
  if (hasKana(text)) return "ja";
  return "en";
}

export const EDGE_VOICES: Record<SpeechLang, { voice: string; lang: string; bcp47: string }> = {
  ko: { voice: "ko-KR-SunHiNeural", lang: "ko-KR", bcp47: "ko-KR" },
  en: { voice: "en-US-JennyNeural", lang: "en-US", bcp47: "en-US" },
  ja: { voice: "ja-JP-NanamiNeural", lang: "ja-JP", bcp47: "ja-JP" },
};

export type VoiceStyle = { pitch: string; rate: string };

const DEFAULT_STYLE: VoiceStyle = { pitch: "default", rate: "default" };
const MOCO_STYLE: VoiceStyle = { pitch: "+18%", rate: "+10%" };

/** Only Moco gets the brighter VTuber tone. Other members stay at the stock neural read. */
export function voiceStyleForCharacter(characterId: string | null | undefined): VoiceStyle {
  const id = characterId?.trim().toLowerCase();
  if (!id || id === "moco") return MOCO_STYLE;
  return DEFAULT_STYLE;
}
