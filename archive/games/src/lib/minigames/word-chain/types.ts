/** 끝말잇기 사전·검증 공유 타입 */

export const WORD_CHAIN_TURN_MS = 20_000;
export const WORD_CHAIN_MIN_LEN = 2;
export const WORD_CHAIN_MAX_LEN = 12;

export type WordChainDictEntry = {
  word: string;
  firstChar: string;
  lastChar: string;
  type?: string;
};

export type WordChainRejectReason =
  | "empty"
  | "format"
  | "duplicate"
  | "start_char"
  | "not_in_dictionary"
  | "blacklist"
  | "server_error";

export type WordChainValidationResult = {
  ok: boolean;
  normalized?: string;
  reason?: WordChainRejectReason;
  message?: string;
  step?: string;
};

export type WordChainValidateContext = {
  currentWord: string | null;
  usedWords: string[];
};

export type WordChainValidateOptions = {
  /** true면 명사(type=명사)만 허용 */
  requireNoun?: boolean;
  /** 클라이언트 미리보기 — 사전 미로드 시 format까지만 */
  preview?: boolean;
};

export const REJECT_MESSAGES: Record<WordChainRejectReason, string> = {
  empty: "단어를 입력하세요.",
  format: "2~12자 한글(가~힣)만 입력 가능합니다.",
  duplicate: "이미 사용한 단어입니다.",
  start_char: "시작 글자가 맞지 않습니다.",
  not_in_dictionary: "사전에 없는 단어입니다.",
  blacklist: "금지어입니다.",
  server_error: "서버 오류가 발생했습니다.",
};
