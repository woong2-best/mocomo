/**
 * 우리말샘(opendict) XML → 끝말잇기 import JSON
 *
 * Usage:
 *   npm run word-chain:import-opendict
 *   npm run word-chain:import-opendict -- "C:\path\to\korean-dict-nikl-master\opendict"
 *
 * Env: WORD_CHAIN_OPENDICT_DIR — XML 폴더 경로
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeWordChainWord, toDictEntry } from "../src/lib/minigames/word-chain/normalize";
import type { WordChainDictEntry } from "../src/lib/minigames/word-chain/types";
import { WORD_CHAIN_MAX_LEN, WORD_CHAIN_MIN_LEN } from "../src/lib/minigames/word-chain/types";

const DEFAULT_SOURCE = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "Desktop",
  "korean-dict-nikl-master",
  "opendict"
);

const OUT_DIR = path.join(process.cwd(), "data", "word-chain", "imports");
const OUT_JSON = path.join(OUT_DIR, "opendict-nikl.json");

function resolveSourceDir(): string {
  const arg = process.argv[2]?.trim();
  if (arg) return path.resolve(arg);
  const env = process.env.WORD_CHAIN_OPENDICT_DIR?.trim();
  if (env) return path.resolve(env);
  return DEFAULT_SOURCE;
}

function cleanOpendictSurface(raw: string): string {
  return raw
    .replace(/-/g, "")
    .replace(/\d+$/, "")
    .trim();
}

function isValidWord(word: string): boolean {
  if (word.length < WORD_CHAIN_MIN_LEN || word.length > WORD_CHAIN_MAX_LEN) return false;
  return /^[가-힣]+$/.test(word);
}

function extractFromItem(block: string): { word: string; pos: string } | null {
  const wordMatch = block.match(/<wordInfo>\s*<word><!\[CDATA\[([^\]]+)\]\]><\/word>/);
  if (!wordMatch) return null;
  const posMatch = block.match(/<senseInfo>[\s\S]*?<pos>([^<]+)<\/pos>/);
  const surface = cleanOpendictSurface(wordMatch[1]!);
  const normalized = normalizeWordChainWord(surface);
  if (!isValidWord(normalized)) return null;
  return { word: normalized, pos: posMatch?.[1]?.trim() ?? "명사" };
}

function parseXmlFile(filePath: string, map: Map<string, WordChainDictEntry>): number {
  const xml = fs.readFileSync(filePath, "utf8");
  const blocks = xml.split("</item>");
  let added = 0;
  for (const block of blocks) {
    const parsed = extractFromItem(block);
    if (!parsed || map.has(parsed.word)) continue;
    map.set(parsed.word, toDictEntry(parsed.word, parsed.pos));
    added++;
  }
  return added;
}

function main() {
  const sourceDir = resolveSourceDir();
  if (!fs.existsSync(sourceDir)) {
    console.error("[word-chain:import-opendict] source not found:", sourceDir);
    console.error("  Pass path: npm run word-chain:import-opendict -- \"C:\\...\\opendict\"");
    process.exit(1);
  }

  const files = fs
    .readdirSync(sourceDir)
    .filter((f) => f.endsWith(".xml"))
    .sort();

  if (!files.length) {
    console.error("[word-chain:import-opendict] no XML files in", sourceDir);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const map = new Map<string, WordChainDictEntry>();

  console.info("[word-chain:import-opendict] source:", sourceDir);
  console.info("[word-chain:import-opendict] files:", files.length);

  for (const file of files) {
    const t0 = Date.now();
    const filePath = path.join(sourceDir, file);
    const newWords = parseXmlFile(filePath, map);
    const ms = Date.now() - t0;
    console.info(
      `[word-chain:import-opendict] ${file}: +${newWords} unique (total ${map.size}) ${ms}ms`
    );
  }

  const entries = [...map.values()].sort((a, b) => a.word.localeCompare(b.word, "ko"));
  const payload = {
    version: 1,
    source: "opendict-nikl",
    generatedAt: new Date().toISOString(),
    count: entries.length,
    entries,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(payload), "utf8");
  const sizeMb = (fs.statSync(OUT_JSON).size / (1024 * 1024)).toFixed(1);
  console.info(`[word-chain:import-opendict] wrote ${entries.length} words → ${OUT_JSON} (${sizeMb} MB)`);
  console.info("[word-chain:import-opendict] next: npm run word-chain:build");
}

main();
