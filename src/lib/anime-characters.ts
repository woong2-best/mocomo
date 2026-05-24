/** 애니 등장인물 JSON ↔ 코스어 캐릭터 매칭 */

export function parseAnimeCharacters(characters: unknown): string[] {
  if (!characters || !Array.isArray(characters)) return [];
  return characters
    .map((c) => {
      if (typeof c === "string") return c.trim();
      if (typeof c === "object" && c && "name" in c) return String((c as { name: string }).name).trim();
      return "";
    })
    .filter(Boolean);
}

export function normalizeCharacterName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

/** 등장인물 목록에 코스 캐릭터가 있는지 (부분 일치 포함) */
export function characterMatchesAnime(characterName: string, characters: unknown): boolean {
  const query = normalizeCharacterName(characterName);
  if (!query) return false;
  const list = parseAnimeCharacters(characters);
  return list.some((name) => {
    const n = normalizeCharacterName(name);
    return n === query || n.includes(query) || query.includes(n);
  });
}

/** 매칭된 공식 캐릭터명 반환 (없으면 null) */
export function resolveAnimeCharacterName(characterName: string, characters: unknown): string | null {
  const query = normalizeCharacterName(characterName);
  if (!query) return null;
  const list = parseAnimeCharacters(characters);
  const found = list.find((name) => {
    const n = normalizeCharacterName(name);
    return n === query || n.includes(query) || query.includes(n);
  });
  return found ?? null;
}
