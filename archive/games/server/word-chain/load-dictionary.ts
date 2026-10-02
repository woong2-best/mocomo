import fs from "node:fs";
import path from "node:path";
import { getWordChainDictionary } from "../../src/lib/minigames/word-chain/dictionary";
import { normalizeWordChainWord } from "../../src/lib/minigames/word-chain/normalize";
import type { WordChainDictEntry } from "../../src/lib/minigames/word-chain/types";
import { EXTRA_COMMON_WORDS } from "../../src/lib/minigames/word-chain/extra-words";
import { toDictEntry } from "../../src/lib/minigames/word-chain/normalize";

const DATA_DIR = path.join(process.cwd(), "data", "word-chain");

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch (err) {
    console.error("[word-chain] failed to read", filePath, err);
    return null;
  }
}

function loadStringList(filePath: string): string[] {
  const data = readJsonFile<string[]>(filePath);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeWordChainWord).filter(Boolean);
}

function loadDictionaryEntries(): WordChainDictEntry[] {
  const dictPath =
    process.env.WORD_CHAIN_DICT_PATH?.trim() || path.join(DATA_DIR, "dictionary.json");
  const payload = readJsonFile<{ entries?: WordChainDictEntry[] }>(dictPath);
  if (payload?.entries?.length) {
    console.info(`[word-chain] loaded dictionary.json (${payload.entries.length} entries)`);
    return payload.entries;
  }

  console.warn("[word-chain] dictionary.json missing — falling back to built-in seed words");
  return EXTRA_COMMON_WORDS.map((w) => toDictEntry(w));
}

/** 서버 시작 시 1회 호출 — 메모리 Set/Map 로드 */
export function loadWordChainDictionaryFromDisk(): void {
  const dict = getWordChainDictionary();
  dict.clear();

  const entries = loadDictionaryEntries();
  dict.loadEntries(entries, "dictionary.json");

  // imports/*.json 은 build 시 dictionary.json에 병합됨 — 시드 fallback일 때만 런타임 merge
  if (entries.length < 10_000) {
    const importsDir = path.join(DATA_DIR, "imports");
    if (fs.existsSync(importsDir)) {
      for (const file of fs.readdirSync(importsDir).filter((f) => f.endsWith(".json"))) {
        const payload = readJsonFile<{ entries?: WordChainDictEntry[] } | WordChainDictEntry[]>(
          path.join(importsDir, file)
        );
        const list = Array.isArray(payload) ? payload : payload?.entries;
        if (list?.length) {
          dict.mergeEntries(list);
          console.info(`[word-chain] merged import ${file} (${list.length} rows)`);
        }
      }
    }
  }

  const whitelistPath =
    process.env.WORD_CHAIN_WHITELIST_PATH?.trim() || path.join(DATA_DIR, "whitelist.json");
  const blacklistPath =
    process.env.WORD_CHAIN_BLACKLIST_PATH?.trim() || path.join(DATA_DIR, "blacklist.json");

  dict.setWhitelist(loadStringList(whitelistPath));
  dict.setBlacklist(loadStringList(blacklistPath));

  console.info("[word-chain] dictionary initialized", dict.getStats());
}

/** 운영자 — 허용/금지 단어 런타임 추가 (파일 저장은 별도) */
export function addWordChainWhitelistWord(word: string) {
  getWordChainDictionary().addWhitelist(word);
}

export function addWordChainBlacklistWord(word: string) {
  getWordChainDictionary().addBlacklist(word);
}

export function reloadWordChainListsFromDisk() {
  const dict = getWordChainDictionary();
  const whitelistPath =
    process.env.WORD_CHAIN_WHITELIST_PATH?.trim() || path.join(DATA_DIR, "whitelist.json");
  const blacklistPath =
    process.env.WORD_CHAIN_BLACKLIST_PATH?.trim() || path.join(DATA_DIR, "blacklist.json");
  dict.setWhitelist(loadStringList(whitelistPath));
  dict.setBlacklist(loadStringList(blacklistPath));
}
