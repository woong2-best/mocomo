/**
 * 끝말잇기 사전 빌드
 * - JSON (dictionary.json)
 * - SQLite SQL (dictionary.sql) — sqlite3 CLI로 import 가능
 *
 * 우리말샘/국립국어원 데이터: data/word-chain/imports/*.json 에
 * [{ "word": "...", "type": "명사" }] 형식으로 추가 후 재실행
 */
import fs from "node:fs";
import path from "node:path";
import { EXTRA_COMMON_WORDS } from "../src/lib/minigames/word-chain/extra-words";
import { normalizeWordChainWord, toDictEntry } from "../src/lib/minigames/word-chain/normalize";
import type { WordChainDictEntry } from "../src/lib/minigames/word-chain/types";
import { WORD_CHAIN_MAX_LEN, WORD_CHAIN_MIN_LEN } from "../src/lib/minigames/word-chain/types";

const ROOT = path.join(process.cwd(), "data", "word-chain");
const IMPORTS_DIR = path.join(ROOT, "imports");
const OUT_JSON = path.join(ROOT, "dictionary.json");
const OUT_SQL = path.join(ROOT, "dictionary.sql");

function isValidSeed(word: string): boolean {
  const w = normalizeWordChainWord(word);
  if (w.length < WORD_CHAIN_MIN_LEN || w.length > WORD_CHAIN_MAX_LEN) return false;
  return /^[가-힣]+$/.test(w);
}

function loadImportFiles(): WordChainDictEntry[] {
  if (!fs.existsSync(IMPORTS_DIR)) return [];
  const files = fs.readdirSync(IMPORTS_DIR).filter((f) => f.endsWith(".json"));
  const out: WordChainDictEntry[] = [];
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(IMPORTS_DIR, file), "utf8")) as unknown;
    const list = Array.isArray(raw)
      ? raw
      : ((raw as { entries?: unknown[] }).entries ?? []);
    let count = 0;
    for (const item of list) {
      if (typeof item === "string") {
        if (isValidSeed(item)) {
          out.push(toDictEntry(item));
          count++;
        }
      } else if (item && typeof item === "object" && "word" in item) {
        const w = String((item as { word: string }).word);
        const type = String((item as { type?: string }).type ?? "명사");
        if (isValidSeed(w)) {
          out.push(toDictEntry(w, type));
          count++;
        }
      }
    }
    console.log(`[word-chain:build] import ${file}: ${count} valid words (${list.length} rows)`);
  }
  return out;
}

function loadLegacyJson(): string[] {
  const legacyPath = path.join(ROOT, "legacy-words.json");
  if (!fs.existsSync(legacyPath)) return [];
  const raw = fs.readFileSync(legacyPath, "utf8").trim();
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) ? list.filter(isValidSeed) : [];
  } catch (err) {
    console.warn("[word-chain:build] legacy-words.json parse failed — skipping", err);
    return [];
  }
}

function dedupeEntries(entries: WordChainDictEntry[]): WordChainDictEntry[] {
  const map = new Map<string, WordChainDictEntry>();
  for (const e of entries) {
    const w = normalizeWordChainWord(e.word);
    if (!w || map.has(w)) continue;
    map.set(w, {
      word: w,
      firstChar: w[0]!,
      lastChar: w[w.length - 1]!,
      type: e.type ?? "명사",
    });
  }
  return [...map.values()].sort((a, b) => a.word.localeCompare(b.word, "ko"));
}

function writeSql(entries: WordChainDictEntry[]) {
  const lines: string[] = [
    "-- MoCoMo word-chain dictionary",
    "-- sqlite3 data/word-chain/dictionary.sqlite < data/word-chain/dictionary.sql",
    "PRAGMA journal_mode=WAL;",
    "DROP TABLE IF EXISTS words;",
    "CREATE TABLE words (",
    "  word TEXT PRIMARY KEY NOT NULL,",
    "  first_char TEXT NOT NULL,",
    "  last_char TEXT NOT NULL,",
    "  type TEXT",
    ");",
    "CREATE INDEX idx_words_first ON words(first_char);",
    "CREATE INDEX idx_words_last ON words(last_char);",
    "BEGIN TRANSACTION;",
  ];
  for (const e of entries) {
    const w = e.word.replace(/'/g, "''");
    const t = (e.type ?? "명사").replace(/'/g, "''");
    lines.push(
      `INSERT INTO words (word, first_char, last_char, type) VALUES ('${w}', '${e.firstChar}', '${e.lastChar}', '${t}');`
    );
  }
  lines.push("COMMIT;");
  fs.writeFileSync(OUT_SQL, lines.join("\n"), "utf8");
}

function main() {
  fs.mkdirSync(ROOT, { recursive: true });
  fs.mkdirSync(IMPORTS_DIR, { recursive: true });

  const seeds = [
    ...EXTRA_COMMON_WORDS,
    ...loadLegacyJson(),
  ].filter(isValidSeed);

  const entries = dedupeEntries([
    ...seeds.map((w) => toDictEntry(w)),
    ...loadImportFiles(),
  ]);

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    count: entries.length,
    entries,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");
  writeSql(entries);

  console.log(`[word-chain:build] wrote ${entries.length} words → ${OUT_JSON}`);
  console.log(`[word-chain:build] wrote SQL → ${OUT_SQL}`);
}

main();
