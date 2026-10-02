import type { WordChainDictEntry } from "./types";
import { normalizeWordChainWord, toDictEntry } from "./normalize";

const DEBUG = process.env.WORD_CHAIN_DEBUG === "1" || process.env.NODE_ENV === "development";

export type DictionaryStats = {
  words: number;
  whitelist: number;
  blacklist: number;
  ready: boolean;
  source?: string;
};

export class WordChainDictionary {
  private words = new Set<string>();
  private entries = new Map<string, WordChainDictEntry>();
  private whitelist = new Set<string>();
  private blacklist = new Set<string>();
  private byFirstChar = new Map<string, Set<string>>();
  private ready = false;
  private source = "none";

  getStats(): DictionaryStats {
    return {
      words: this.words.size,
      whitelist: this.whitelist.size,
      blacklist: this.blacklist.size,
      ready: this.ready,
      source: this.source,
    };
  }

  isReady() {
    return this.ready;
  }

  markReady(source: string) {
    this.ready = true;
    this.source = source;
    if (DEBUG) {
      console.info("[word-chain] dictionary ready", this.getStats());
    }
  }

  clear() {
    this.words.clear();
    this.entries.clear();
    this.whitelist.clear();
    this.blacklist.clear();
    this.byFirstChar.clear();
    this.ready = false;
    this.source = "none";
  }

  loadEntries(entries: WordChainDictEntry[], source: string) {
    for (const raw of entries) {
      const word = normalizeWordChainWord(raw.word);
      if (!word) continue;
      const entry: WordChainDictEntry = {
        word,
        firstChar: raw.firstChar || word[0]!,
        lastChar: raw.lastChar || word[word.length - 1]!,
        type: raw.type ?? "명사",
      };
      this.words.add(word);
      this.entries.set(word, entry);
      if (!this.byFirstChar.has(entry.firstChar)) {
        this.byFirstChar.set(entry.firstChar, new Set());
      }
      this.byFirstChar.get(entry.firstChar)!.add(word);
    }
    this.markReady(source);
  }

  loadWordList(words: string[], source: string, type = "명사") {
    const entries = words.map((w) => toDictEntry(w, type));
    this.loadEntries(entries, source);
  }

  mergeEntries(entries: WordChainDictEntry[]) {
    for (const raw of entries) {
      const word = normalizeWordChainWord(raw.word);
      if (!word || this.words.has(word)) continue;
      const entry: WordChainDictEntry = {
        word,
        firstChar: raw.firstChar || word[0]!,
        lastChar: raw.lastChar || word[word.length - 1]!,
        type: raw.type ?? "명사",
      };
      this.words.add(word);
      this.entries.set(word, entry);
      if (!this.byFirstChar.has(entry.firstChar)) {
        this.byFirstChar.set(entry.firstChar, new Set());
      }
      this.byFirstChar.get(entry.firstChar)!.add(word);
    }
  }

  setWhitelist(words: string[]) {
    this.whitelist.clear();
    for (const w of words) {
      const n = normalizeWordChainWord(w);
      if (n) this.whitelist.add(n);
    }
  }

  setBlacklist(words: string[]) {
    this.blacklist.clear();
    for (const w of words) {
      const n = normalizeWordChainWord(w);
      if (n) this.blacklist.add(n);
    }
  }

  addWhitelist(word: string) {
    const n = normalizeWordChainWord(word);
    if (n) this.whitelist.add(n);
  }

  addBlacklist(word: string) {
    const n = normalizeWordChainWord(word);
    if (n) this.blacklist.add(n);
  }

  isWhitelisted(word: string): boolean {
    return this.whitelist.has(normalizeWordChainWord(word));
  }

  /** 사전 본문(whitelist 제외)에 포함 여부 */
  isInDictionary(word: string): boolean {
    return this.words.has(normalizeWordChainWord(word));
  }

  isBlacklisted(word: string): boolean {
    return this.blacklist.has(normalizeWordChainWord(word));
  }

  has(word: string): boolean {
    const n = normalizeWordChainWord(word);
    return this.whitelist.has(n) || this.words.has(n);
  }

  isNoun(word: string): boolean {
    const n = normalizeWordChainWord(word);
    const entry = this.entries.get(n);
    if (!entry?.type) return true;
    return entry.type.includes("명사");
  }

  getEntry(word: string): WordChainDictEntry | undefined {
    return this.entries.get(normalizeWordChainWord(word));
  }

  /** firstChar로 시작하는 단어 샘플 (힌트용) */
  sampleByFirstChar(char: string, limit = 5): string[] {
    const set = this.byFirstChar.get(char);
    if (!set) return [];
    return [...set].slice(0, limit);
  }

  logDictionaryMiss(raw: string, normalized: string, step: string) {
    const inDict = this.words.has(normalized);
    if (inDict) {
      console.error("[word-chain] dict miss bug — word exists in Set", {
        step,
        raw: JSON.stringify(raw),
        normalized,
      });
      return;
    }
    console.warn("[word-chain] dict miss", {
      step,
      raw: JSON.stringify(raw),
      normalized,
      length: normalized.length,
      codepoints: [...normalized].map((c) => c.codePointAt(0)?.toString(16)),
      stats: this.getStats(),
    });
  }
}

let singleton: WordChainDictionary | null = null;

export function getWordChainDictionary(): WordChainDictionary {
  if (!singleton) singleton = new WordChainDictionary();
  return singleton;
}

export function resetWordChainDictionaryForTests() {
  singleton = null;
}
