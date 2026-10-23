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

export const AIRI_MAYU_VOICE = "ja-JP-MayuNeural";
export const AIRI_MAYU_LANG = "ja-JP";

export type VoiceStyle = { pitch: string; rate: string };

const DEFAULT_STYLE: VoiceStyle = { pitch: "default", rate: "default" };
const MOCO_STYLE: VoiceStyle = { pitch: "+18%", rate: "+10%" };
/** Chloe stays tipsy: higher pitch, slower slurred tempo. */
const CHLOE_STYLE: VoiceStyle = { pitch: "+18%", rate: "-12%" };
/** Mayu reads high; drop pitch for a husky, lazy AIRI tone. */
const AIRI_STYLE: VoiceStyle = { pitch: "-15%", rate: "+5%" };

export function isAiriCharacter(characterId: string | null | undefined): boolean {
  const id = characterId?.trim().toLowerCase();
  return id === "airi" || id === "cleo";
}

/** Hiragana → katakana so Mayu reads the Japanese line as requested. */
export function toKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

function escapeSsml(text: string): string {
  return text.replace(/[<>&"']/g, (ch) => {
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === "&") return "&amp;";
    if (ch === '"') return "&quot;";
    return "&apos;";
  });
}

/** SSML sent for AIRI. `node-edge-tts` builds the same voice/prosody from these values. */
export function wrapAiriMayuSsml(text: string): string {
  const body = escapeSsml(toKatakana(text));
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
    <voice name="${AIRI_MAYU_VOICE}">
        <prosody pitch="-15%" rate="+5%">
            ${body}
        </prosody>
    </voice>
</speak>`;
}

/** Moco is brighter; Chloe is drunk-slow; AIRI is husky Mayu. */
export function voiceStyleForCharacter(characterId: string | null | undefined): VoiceStyle {
  const id = characterId?.trim().toLowerCase();
  if (!id || id === "moco" || id === "zelie") return MOCO_STYLE;
  if (id === "chloe" || id === "mio") return CHLOE_STYLE;
  if (id === "airi" || id === "cleo") return AIRI_STYLE;
  return DEFAULT_STYLE;
}
