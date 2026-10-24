export type SpeechLang = "ko" | "en" | "ja" | "zh" | "fr";

/** True when the line is Chinese and not Korean or Japanese. */
export function textLooksChinese(text: string): boolean {
  let han = false;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0xac00 && code <= 0xd7a3) return false;
    if (code >= 0x3040 && code <= 0x30ff) return false;
    if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) han = true;
  }
  return han;
}

export const ZELIE_UNKNOWN_LANG = "그 언어는 잘 몰라~ 한국어나 프랑스어로 해줘.";
export const ZELIE_QUIET_KO = "잠깐, 목이 잠겼어. 다시 말해 봐.";
export const ZELIE_QUIET_FR = "Attends, j'ai perdu la voix. Répète ?";
export const ZELIE_BUSY_KO = "지금은 이 방이 너무 붐벼. 조금만 있다가 다시 불러줘.";
export const ZELIE_BUSY_FR = "Là c'est trop bondé. Rappelle-moi juste après.";
export const ZELIE_DEFLECT_KO = "칫. 다른 거 물어봐.";
export const ZELIE_DEFLECT_FR = "Tch. Demande autre chose.";
export const ZELIE_HARD_KO = "그건 얘기 안 해.";
export const ZELIE_HARD_FR = "Je parle pas de ça.";
export const ZELIE_SNAP_KO = ["너 방금 뭐라고 했냐? 이상한 소리 하면 밴이다!", "그런 불법적인 얘기는 안 받아줘. 칫...", "..."];
export const ZELIE_SNAP_FR = ["T'as dit quoi là ? Encore une et t'es ban.", "Je prends pas ce genre de propos. Tch.", "..."];

export const NANGNANG_UNKNOWN_LANG = "这语言我不会，说中文。";
export const NANGNANG_QUIET = "等下，嗓子哑了，再说一遍。";
export const NANGNANG_BUSY = "现在这房间太挤了，等会儿再叫我。";
export const NANGNANG_DEFLECT = "切，问点别的。";
export const NANGNANG_HARD = "那种事我不聊。";
export const NANGNANG_SNAP = ["你说什么呢？再来一句我可要踢了。", "那种话我不接。切。", "..."];

export const MIO_UNKNOWN_LANG = "その言語わかんないよぉ〜 日本語で話してぇ〜";
export const MIO_QUIET = "ちょっと待って、声出なくなっちゃった。もう一回言って？";
export const MIO_BUSY = "今この部屋いっぱいいっぱい〜 あとで呼んでねぇ";
export const MIO_DEFLECT = "ちぇっ。別の話してよぉ";
export const MIO_HARD = "そういう話はしないからぁ";
export const MIO_SNAP = ["今なんて言ったの？変なこと言うとバンするからね！", "そういう話は受けないよぉ。ちぇっ…", "..."];

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

const FR_MARK = /[àâäéèêëïîôùûüçœæÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ]/;
const FR_STRONG =
  /\b(?:bonjour|salut|merci|français|francais|pourquoi|comment|beaucoup|aujourd'hui|s'il|svp|voilà|voila)\b/i;
const FR_WEAK =
  /\b(?:je|tu|nous|vous|il|elle|oui|non|pas|avec|dans|pour|mais|que|qui|une|des|très|tres|ça|ca)\b/i;

export function textLooksFrench(text: string): boolean {
  if (hasHangul(text) || hasKana(text) || textLooksChinese(text)) return false;
  if (FR_MARK.test(text) || FR_STRONG.test(text)) return true;
  return (text.match(FR_WEAK) ?? []).length >= 2;
}

export type ZelieInputLang = "ko" | "fr";

export function zelieInputLang(text: string): ZelieInputLang | null {
  if (hasHangul(text)) return "ko";
  if (textLooksFrench(text)) return "fr";
  return null;
}

/** True when the line has hiragana or katakana. Kanji-only Japanese is treated as unknown. */
export function textLooksJapanese(text: string): boolean {
  return hasKana(text);
}

export function zelieSpeechLang(text: string): Extract<SpeechLang, "ko" | "fr"> {
  return hasHangul(text) ? "ko" : "fr";
}

/** Korean if the line has Hangul, Japanese if it has kana, otherwise English. */
export function speechLangForText(text: string): SpeechLang {
  if (hasHangul(text)) return "ko";
  if (hasKana(text)) return "ja";
  if (textLooksFrench(text)) return "fr";
  return "en";
}

export const EDGE_VOICES: Record<SpeechLang, { voice: string; lang: string; bcp47: string }> = {
  ko: { voice: "ko-KR-SunHiNeural", lang: "ko-KR", bcp47: "ko-KR" },
  en: { voice: "en-US-JennyNeural", lang: "en-US", bcp47: "en-US" },
  ja: { voice: "ja-JP-NanamiNeural", lang: "ja-JP", bcp47: "ja-JP" },
  zh: { voice: "zh-CN-XiaoyiNeural", lang: "zh-CN", bcp47: "zh-CN" },
  fr: { voice: "fr-FR-EloiseNeural", lang: "fr-FR", bcp47: "fr-FR" },
};

export const AIRI_MAYU_VOICE = "ja-JP-MayuNeural";
export const AIRI_MAYU_LANG = "ja-JP";
export const NANGNANG_XIAOYI_VOICE = "zh-CN-XiaoyiNeural";
export const NANGNANG_XIAOYI_LANG = "zh-CN";
export const ZELIE_SEOHYEON_VOICE = "ko-KR-SeoHyeonNeural";
export const ZELIE_SEOHYEON_LANG = "ko-KR";
export const ZELIE_ELOISE_VOICE = "fr-FR-EloiseNeural";
export const ZELIE_ELOISE_LANG = "fr-FR";

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

export function isMioCharacter(characterId: string | null | undefined): boolean {
  const id = characterId?.trim().toLowerCase();
  return id === "mio" || id === "chloe";
}

export function usesMayuVoice(characterId: string | null | undefined): boolean {
  return isAiriCharacter(characterId) || isMioCharacter(characterId);
}

export function isNangnangCharacter(characterId: string | null | undefined): boolean {
  const id = characterId?.trim().toLowerCase();
  return id === "nangnang" || id === "stella";
}

export function isZelieCharacter(characterId: string | null | undefined): boolean {
  const id = characterId?.trim().toLowerCase();
  return id === "zelie" || id === "moco";
}

/** Character-locked Microsoft Edge voice. Null means follow the spoken language. */
export function dedicatedEdgeVoice(
  characterId: string | null | undefined,
  lang?: SpeechLang,
): { voice: string; lang: string } | null {
  if (usesMayuVoice(characterId)) return { voice: AIRI_MAYU_VOICE, lang: AIRI_MAYU_LANG };
  if (isNangnangCharacter(characterId)) return { voice: NANGNANG_XIAOYI_VOICE, lang: NANGNANG_XIAOYI_LANG };
  if (isZelieCharacter(characterId)) {
    if (lang === "fr") return { voice: ZELIE_ELOISE_VOICE, lang: ZELIE_ELOISE_LANG };
    return { voice: ZELIE_SEOHYEON_VOICE, lang: ZELIE_SEOHYEON_LANG };
  }
  return null;
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
