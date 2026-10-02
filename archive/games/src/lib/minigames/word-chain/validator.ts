import { getWordChainDictionary } from "./dictionary";
import {
  checkWordChainFormat,
  normalizeWordChainWord,
  wordChainNextRequiredChar,
} from "./normalize";
import {
  REJECT_MESSAGES,
  type WordChainRejectReason,
  type WordChainValidateContext,
  type WordChainValidateOptions,
  type WordChainValidationResult,
} from "./types";

const DEBUG = process.env.WORD_CHAIN_DEBUG === "1" || process.env.NODE_ENV === "development";

function fail(
  reason: WordChainRejectReason,
  step: string,
  message?: string,
  normalized?: string
): WordChainValidationResult {
  const msg = message ?? REJECT_MESSAGES[reason];
  if (DEBUG) {
    console.info("[word-chain] validate fail", { step, reason, message: msg, normalized });
  }
  if (normalized && reason !== "not_in_dictionary") {
    const dict = getWordChainDictionary();
    if (dict.isInDictionary(normalized) || dict.isWhitelisted(normalized)) {
      console.warn("[word-chain] dict hit but rejected", {
        step,
        reason,
        normalized,
        inDictionary: dict.isInDictionary(normalized),
        whitelisted: dict.isWhitelisted(normalized),
      });
    }
  }
  return { ok: false, reason, message: msg, step, normalized };
}

function pass(normalized: string, step = "pass"): WordChainValidationResult {
  if (DEBUG) console.info("[word-chain] validate pass", { step, normalized });
  return { ok: true, normalized, step };
}

function normalizeUsedWords(used: string[]): string[] {
  return used.map((w) => normalizeWordChainWord(w)).filter(Boolean);
}

/**
 * 검증 순서 (고정):
 * 입력 → 공백 제거 → 형식 → 중복 → 시작 글자 → 허용 목록 → 사전 → 금지 → 통과
 */
export function validateWordChain(
  input: string,
  ctx: WordChainValidateContext,
  options: WordChainValidateOptions = {}
): WordChainValidationResult {
  let step = "normalize";
  try {
    const raw = input;
    const normalized = normalizeWordChainWord(input);

    if (!normalized) {
      return fail("empty", step);
    }

    step = "format";
    const formatMsg = checkWordChainFormat(normalized);
    if (formatMsg) {
      return fail("format", step, formatMsg, normalized);
    }

    step = "duplicate";
    const usedNorm = normalizeUsedWords(ctx.usedWords);
    if (usedNorm.includes(normalized)) {
      return fail("duplicate", step, REJECT_MESSAGES.duplicate, normalized);
    }

    step = "start_char";
    const required = wordChainNextRequiredChar(ctx.currentWord);
    if (required && normalized[0] !== required) {
      return fail(
        "start_char",
        step,
        `「${required}」(으)로 시작하는 단어를 입력하세요.`,
        normalized
      );
    }

    const dict = getWordChainDictionary();

    step = "whitelist";
    const whitelisted = dict.isWhitelisted(normalized);

    if (!whitelisted) {
      step = "dictionary";
      if (!dict.isReady() && !options.preview) {
        return fail("server_error", step, "사전이 아직 로드되지 않았습니다.", normalized);
      }
      if (!dict.isReady() && options.preview) {
        return pass(normalized, "preview_skip_dict");
      }
      if (!dict.isInDictionary(normalized)) {
        dict.logDictionaryMiss(raw, normalized, step);
        return fail("not_in_dictionary", step, REJECT_MESSAGES.not_in_dictionary, normalized);
      }
      if (options.requireNoun && !dict.isNoun(normalized)) {
        return fail("format", step, "명사만 입력 가능합니다.", normalized);
      }
    }

    step = "blacklist";
    if (dict.isBlacklisted(normalized)) {
      return fail("blacklist", step, REJECT_MESSAGES.blacklist, normalized);
    }

    return pass(normalized, "pass");
  } catch (err) {
    console.error("[word-chain] validate server_error", { step, err });
    return fail("server_error", step);
  }
}

/** @deprecated string 반환 — plugin 호환 */
export function validateWordChainMove(
  word: string,
  currentWord: string | null,
  usedWords: string[],
  options?: WordChainValidateOptions
): string | null {
  const result = validateWordChain(word, { currentWord, usedWords }, options);
  return result.ok ? null : result.message ?? REJECT_MESSAGES.server_error;
}

export function previewWordChainInput(
  word: string,
  currentWord: string | null,
  usedWords: string[]
): { ok: boolean; hint: string | null; reason?: WordChainRejectReason } {
  const result = validateWordChain(word, { currentWord, usedWords }, { preview: true });
  return {
    ok: result.ok,
    hint: result.ok ? null : result.message ?? null,
    reason: result.reason,
  };
}

export function isValidWordChainWord(word: string): boolean {
  const dict = getWordChainDictionary();
  const n = normalizeWordChainWord(word);
  if (!n || !checkWordChainFormat(n)) return false;
  return dict.has(n);
}
