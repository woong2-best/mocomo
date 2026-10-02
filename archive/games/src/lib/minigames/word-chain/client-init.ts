let initialized = false;

/**
 * 클라이언트는 단어 검증을 소켓 서버에서 수행합니다.
 * 미리보기(preview)는 형식·중복·시작 글자만 검사하고 사전은 서버에서 확인합니다.
 */
export function ensureClientWordChainDictionary() {
  initialized = true;
}
