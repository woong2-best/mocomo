export type SketchWordEntry = {
  word: string;
  category: string;
  aliases?: string[];
};

/** 서브컬처·애니·게임 중심 단어 풀 */
export const SKETCH_QUIZ_WORDS: SketchWordEntry[] = [
  { word: "원피스", category: "애니", aliases: ["루피", "onepiece"] },
  { word: "나루토", category: "애니", aliases: ["naruto"] },
  { word: "귀멸의 칼날", category: "애니", aliases: ["귀칼", "kimetsu"] },
  { word: "진격의 거인", category: "애니", aliases: ["거인", "aot"] },
  { word: "주술회전", category: "애니", aliases: ["jujutsu"] },
  { word: "체인소 맨", category: "애니", aliases: ["chainsaw"] },
  { word: "스파이 패밀리", category: "애니", aliases: ["스패밀", "spy family"] },
  { word: "갑철성의 카바네리", category: "애니", aliases: ["카바네리", "kabaneri"] },
  { word: "하이큐", category: "애니", aliases: ["haikyuu"] },
  { word: "슬램덩크", category: "애니", aliases: ["slamdunk"] },
  { word: "포켓몬", category: "게임", aliases: ["pokemon", "피카츄"] },
  { word: "마리오", category: "게임", aliases: ["mario"] },
  { word: "젤다", category: "게임", aliases: ["zelda", "링크"] },
  { word: "리그 오브 레전드", category: "게임", aliases: ["롤", "lol"] },
  { word: "오버워치", category: "게임", aliases: ["overwatch"] },
  { word: "마인크래프트", category: "게임", aliases: ["minecraft", "마크"] },
  { word: "코스프레", category: "서브컬처" },
  { word: "굿즈", category: "서브컬처" },
  { word: "피규어", category: "서브컬처" },
  { word: "아크릴 스탠드", category: "서브컬처", aliases: ["아크릴"] },
  { word: "굿즈샵", category: "서브컬처" },
  { word: "팬아트", category: "서브컬처" },
  { word: "오타쿠", category: "서브컬처" },
  { word: "덕질", category: "서브컬처" },
  { word: "성우", category: "애니" },
  { word: "OP", category: "애니", aliases: ["오프닝"] },
  { word: "ED", category: "애니", aliases: ["엔딩"] },
  { word: "캐릭터", category: "애니" },
  { word: "메카", category: "애니" },
  { word: "이세계", category: "애니" },
  { word: "츤데레", category: "애니" },
  { word: "얀데레", category: "애니" },
  { word: "라이브 방송", category: "MoCoMo", aliases: ["라방", "스트리밍"] },
  { word: "후원", category: "MoCoMo", aliases: ["도네", "슈퍼챗"] },
  { word: "이모티콘", category: "MoCoMo" },
  { word: "커뮤니티", category: "MoCoMo" },
  { word: "위고", category: "서브컬처", aliases: ["위그"] },
  { word: "프롭", category: "코스프레" },
  { word: "카메라", category: "코스프레" },
  { word: "촬영", category: "코스프레" },
  { word: "컨벤션", category: "이벤트", aliases: ["코믹월드"] },
  { word: "굿즈 추첨", category: "이벤트" },
  { word: "애니메이션", category: "애니" },
  { word: "만화", category: "애니" },
  { word: "라노벨", category: "애니" },
  { word: "성우 오디션", category: "애니" },
  { word: "블리치", category: "애니", aliases: ["bleach"] },
  { word: "원신", category: "게임", aliases: ["genshin"] },
  { word: "붕괴 스타레일", category: "게임", aliases: ["스타레일", "honkai"] },
  { word: "VTuber", category: "MoCoMo", aliases: ["브이튜버", "vtuber"] },
  { word: "채팅", category: "MoCoMo" },
  { word: "팬미팅", category: "이벤트" },
];

export function normalizeSketchAnswer(text: string): string {
  return text
    .trim()
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function isSketchAnswerCorrect(guess: string, entry: SketchWordEntry): boolean {
  const g = normalizeSketchAnswer(guess);
  if (!g) return false;
  const targets = [entry.word, ...(entry.aliases ?? [])].map(normalizeSketchAnswer);
  return targets.some((t) => t === g);
}

export function pickRandomSketchWord(used: Set<string>): SketchWordEntry {
  const pool = SKETCH_QUIZ_WORDS.filter((w) => !used.has(w.word));
  const list = pool.length ? pool : SKETCH_QUIZ_WORDS;
  return list[Math.floor(Math.random() * list.length)]!;
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{4,8}$/.test(code.toUpperCase());
}
