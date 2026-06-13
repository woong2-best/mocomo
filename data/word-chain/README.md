# 끝말잇기 사전 데이터

## 파일

| 파일 | 설명 |
|------|------|
| `dictionary.json` | 메인 사전 (빌드 생성, 서버·클라이언트 로드) |
| `dictionary.sql` | SQLite import용 (`sqlite3 dictionary.sqlite < dictionary.sql`) |
| `whitelist.json` | 운영자 허용 단어 (사전 없어도 정답) |
| `blacklist.json` | 운영자 금지 단어 |
| `legacy-words.json` | 이전 MVP 사전 (빌드 시 병합) |
| `imports/*.json` | 우리말샘·국립국어원 등 외부 데이터 |

## 빌드

```bash
# 우리말샘 XML → import JSON (최초 1회 또는 XML 갱신 시)
npm run word-chain:import-opendict -- "C:\path\to\korean-dict-nikl-master\opendict"

# 시드 + imports → dictionary.json / dictionary.sql
npm run word-chain:build
```

`WORD_CHAIN_OPENDICT_DIR` 환경 변수로 XML 폴더 경로를 지정할 수도 있습니다.

## 외부 사전 추가 (우리말샘 / 국립국어원)

`imports/` 폴더에 JSON 추가:

```json
[
  { "word": "면허", "type": "명사" },
  { "word": "짜장면", "type": "명사" }
]
```

또는 `{ "entries": [ ... ] }` 형식.

## 환경 변수 (Render 등)

- `WORD_CHAIN_DICT_PATH` — dictionary.json 경로
- `WORD_CHAIN_WHITELIST_PATH` — whitelist.json 경로
- `WORD_CHAIN_BLACKLIST_PATH` — blacklist.json 경로
- `WORD_CHAIN_DEBUG=1` — 검증 단계 로그

## 검증 순서

입력 → trim/정규화 → 형식 → 중복 → 시작 글자 → whitelist → dictionary → blacklist → 통과
