/** 끝말잇기 공개 API — 기존 import 경로 호환 */
export {
  WORD_CHAIN_TURN_MS,
  WORD_CHAIN_MIN_LEN,
  WORD_CHAIN_MAX_LEN,
  type WordChainDictEntry,
  type WordChainRejectReason,
  type WordChainValidationResult,
} from "./word-chain/types";

export {
  normalizeWordChainWord,
  wordChainNextRequiredChar,
  checkWordChainFormat,
  toDictEntry,
} from "./word-chain/normalize";

export {
  getWordChainDictionary,
  type DictionaryStats,
} from "./word-chain/dictionary";

export {
  validateWordChain,
  validateWordChainMove,
  previewWordChainInput,
  isValidWordChainWord,
} from "./word-chain/validator";
