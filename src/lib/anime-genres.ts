import { AnimeGenre } from "@prisma/client";

export const ANIME_GENRES: {
  id: AnimeGenre;
  label: string;
  emoji: string;
  description: string;
}[] = [
  { id: "ACTION", label: "액션", emoji: "⚔️", description: "박진감 넘치는 전투와 스펙터클" },
  { id: "ROMANCE", label: "로맨스", emoji: "💕", description: "사랑과 관계를 다루는 작품" },
  { id: "COMEDY", label: "코미디", emoji: "😂", description: "웃음과 유쾌함" },
  { id: "FANTASY", label: "판타지", emoji: "🐉", description: "마법과 이세계 모험" },
  { id: "SCI_FI", label: "SF", emoji: "🚀", description: "과학·미래·우주" },
  { id: "SLICE_OF_LIFE", label: "일상", emoji: "☕", description: "평범하고 따뜻한 하루" },
  { id: "HORROR", label: "호러", emoji: "👻", description: "공포와 스릴" },
  { id: "SPORTS", label: "스포츠", emoji: "⚽", description: "운동과 성장" },
  { id: "MECHA", label: "메카", emoji: "🤖", description: "로봇·거대병기" },
  { id: "ISEKAI", label: "이세계", emoji: "🌀", description: "다른 세계로의 전생·이동" },
  { id: "SCHOOL", label: "학원", emoji: "🏫", description: "학교를 배경으로" },
  { id: "MUSIC", label: "음악", emoji: "🎵", description: "밴드·아이돌·뮤지컬" },
  { id: "MYSTERY", label: "미스터리", emoji: "🔍", description: "수사와 추리" },
  { id: "SUPERNATURAL", label: "초자연", emoji: "✨", description: "초능력·요괴·신비" },
  { id: "DRAMA", label: "드라마", emoji: "🎭", description: "감동과 인간 드라마" },
  { id: "ADVENTURE", label: "모험", emoji: "🗺️", description: "여행과 탐험" },
  { id: "OTHER", label: "기타", emoji: "📺", description: "그 외 장르" },
];

export function getGenreInfo(genre: AnimeGenre) {
  return ANIME_GENRES.find((g) => g.id === genre) ?? ANIME_GENRES[ANIME_GENRES.length - 1];
}

export function genreFromParam(param: string): AnimeGenre | null {
  const upper = param.toUpperCase().replace(/-/g, "_");
  if (ANIME_GENRES.some((g) => g.id === upper)) return upper as AnimeGenre;
  return null;
}

export function genreToParam(genre: AnimeGenre): string {
  return genre.toLowerCase().replace(/_/g, "-");
}
