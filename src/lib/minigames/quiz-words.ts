/** 초성퀴즈 · 단어맞추기 단어 풀 */

export type WordQuizEntry = { word: string; hint?: string; chosung: string };

function toChosung(word: string): string {
  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  let out = "";
  for (const ch of word.normalize("NFC")) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      out += CHO[Math.floor((code - 0xac00) / 588)]!;
    }
  }
  return out;
}

const RAW: { word: string; hint?: string }[] = [
  { word: "사과", hint: "과일" },
  { word: "바나나", hint: "노란 과일" },
  { word: "컴퓨터", hint: "전자기기" },
  { word: "스마트폰", hint: "통신" },
  { word: "애니메이션", hint: "일본" },
  { word: "만화", hint: "그림" },
  { word: "게임", hint: "오락" },
  { word: "음악", hint: "멜로디" },
  { word: "영화", hint: "극장" },
  { word: "여행", hint: "휴가" },
  { word: "커피", hint: "음료" },
  { word: "피자", hint: "음식" },
  { word: "치킨", hint: "음식" },
  { word: "축구", hint: "스포츠" },
  { word: "야구", hint: "스포츠" },
  { word: "수영", hint: "물" },
  { word: "강아지", hint: "반려" },
  { word: "고양이", hint: "반려" },
  { word: "자동차", hint: "탈것" },
  { word: "비행기", hint: "하늘" },
  { word: "우주", hint: "별" },
  { word: "행복", hint: "감정" },
  { word: "사랑", hint: "감정" },
  { word: "친구", hint: "사람" },
  { word: "학교", hint: "교육" },
  { word: "도서관", hint: "책" },
  { word: "병원", hint: "건강" },
  { word: "공원", hint: "산책" },
  { word: "바다", hint: "자연" },
  { word: "산", hint: "자연" },
];

export const WORD_QUIZ_POOL: WordQuizEntry[] = RAW.map((e) => ({
  ...e,
  chosung: toChosung(e.word),
}));

export function pickQuizWord(used: Set<string>): WordQuizEntry {
  const pool = WORD_QUIZ_POOL.filter((w) => !used.has(w.word));
  const list = pool.length ? pool : WORD_QUIZ_POOL;
  return list[Math.floor(Math.random() * list.length)]!;
}

export function normalizeQuizAnswer(text: string): string {
  return text.trim().normalize("NFC").replace(/\s+/g, "").toLowerCase();
}

export function isQuizAnswerCorrect(guess: string, word: string): boolean {
  return normalizeQuizAnswer(guess) === normalizeQuizAnswer(word);
}

export function pickSecretNumber(min = 1, max = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
