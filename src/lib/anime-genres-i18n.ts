import type { AnimeGenre } from "@prisma/client";
import type { Locale } from "@/lib/i18n/config";
import { ANIME_GENRES } from "@/lib/anime-genres";

type GenreText = { label: string; description: string };

const GENRE_TEXT: Record<Locale, Record<AnimeGenre, GenreText>> = {
  ko: {
    ACTION: { label: "액션", description: "박진감 넘치는 전투와 스펙터클" },
    ROMANCE: { label: "로맨스", description: "사랑과 관계를 다루는 작품" },
    COMEDY: { label: "코미디", description: "웃음과 유쾌함" },
    FANTASY: { label: "판타지", description: "마법과 이세계 모험" },
    SCI_FI: { label: "SF", description: "과학·미래·우주" },
    SLICE_OF_LIFE: { label: "일상", description: "평범하고 따뜻한 하루" },
    HORROR: { label: "호러", description: "공포와 스릴" },
    SPORTS: { label: "스포츠", description: "운동과 성장" },
    MECHA: { label: "메카", description: "로봇·거대병기" },
    ISEKAI: { label: "이세계", description: "다른 세계로의 전생·이동" },
    SCHOOL: { label: "학원", description: "학교를 배경으로" },
    MUSIC: { label: "음악", description: "밴드·아이돌·뮤지컬" },
    MYSTERY: { label: "미스터리", description: "수사와 추리" },
    SUPERNATURAL: { label: "초자연", description: "초능력·요괴·신비" },
    DRAMA: { label: "드라마", description: "감동과 인간 드라마" },
    ADVENTURE: { label: "모험", description: "여행과 탐험" },
    OTHER: { label: "기타", description: "그 외 장르" },
  },
  en: {
    ACTION: { label: "Action", description: "High-energy battles and spectacle" },
    ROMANCE: { label: "Romance", description: "Love and relationships" },
    COMEDY: { label: "Comedy", description: "Laughs and lighthearted fun" },
    FANTASY: { label: "Fantasy", description: "Magic and otherworldly adventure" },
    SCI_FI: { label: "Sci-Fi", description: "Science, future, and space" },
    SLICE_OF_LIFE: { label: "Slice of Life", description: "Warm everyday moments" },
    HORROR: { label: "Horror", description: "Fear and suspense" },
    SPORTS: { label: "Sports", description: "Athletics and growth" },
    MECHA: { label: "Mecha", description: "Robots and giant machines" },
    ISEKAI: { label: "Isekai", description: "Rebirth and travel to other worlds" },
    SCHOOL: { label: "School", description: "Set in schools and campuses" },
    MUSIC: { label: "Music", description: "Bands, idols, and musicals" },
    MYSTERY: { label: "Mystery", description: "Investigation and deduction" },
    SUPERNATURAL: { label: "Supernatural", description: "Powers, spirits, and mystery" },
    DRAMA: { label: "Drama", description: "Emotional human stories" },
    ADVENTURE: { label: "Adventure", description: "Journeys and exploration" },
    OTHER: { label: "Other", description: "Everything else" },
  },
  ja: {
    ACTION: { label: "アクション", description: "迫力あるバトルとスペクタクル" },
    ROMANCE: { label: "ロマンス", description: "恋愛と人間関係" },
    COMEDY: { label: "コメディ", description: "笑いと明るい雰囲気" },
    FANTASY: { label: "ファンタジー", description: "魔法と異世界の冒険" },
    SCI_FI: { label: "SF", description: "科学・未来・宇宙" },
    SLICE_OF_LIFE: { label: "日常", description: "あたたかい日常の物語" },
    HORROR: { label: "ホラー", description: "恐怖とスリル" },
    SPORTS: { label: "スポーツ", description: "競技と成長" },
    MECHA: { label: "メカ", description: "ロボット・巨大兵器" },
    ISEKAI: { label: "異世界", description: "転生・異世界移動" },
    SCHOOL: { label: "学園", description: "学校が舞台" },
    MUSIC: { label: "音楽", description: "バンド・アイドル・ミュージカル" },
    MYSTERY: { label: "ミステリー", description: "捜査と推理" },
    SUPERNATURAL: { label: "超自然", description: "超能力・妖怪・神秘" },
    DRAMA: { label: "ドラマ", description: "感動と人間ドラマ" },
    ADVENTURE: { label: "冒険", description: "旅と探検" },
    OTHER: { label: "その他", description: "その他のジャンル" },
  },
  zh: {
    ACTION: { label: "动作", description: "热血战斗与视觉奇观" },
    ROMANCE: { label: "恋爱", description: "爱情与人际关系" },
    COMEDY: { label: "喜剧", description: "轻松搞笑" },
    FANTASY: { label: "奇幻", description: "魔法与异世界冒险" },
    SCI_FI: { label: "科幻", description: "科学、未来与宇宙" },
    SLICE_OF_LIFE: { label: "日常", description: "温暖平凡的日常" },
    HORROR: { label: "恐怖", description: "惊悚与悬疑" },
    SPORTS: { label: "运动", description: "竞技与成长" },
    MECHA: { label: "机甲", description: "机器人与巨型兵器" },
    ISEKAI: { label: "异世界", description: "转生与他界穿越" },
    SCHOOL: { label: "校园", description: "以学校为背景" },
    MUSIC: { label: "音乐", description: "乐队、偶像与音乐剧" },
    MYSTERY: { label: "悬疑", description: "调查与推理" },
    SUPERNATURAL: { label: "超自然", description: "异能、妖怪与神秘" },
    DRAMA: { label: "剧情", description: "感人的人性故事" },
    ADVENTURE: { label: "冒险", description: "旅行与探索" },
    OTHER: { label: "其他", description: "其他类型" },
  },
};

export function getLocalizedAnimeGenres(locale: Locale) {
  const text = GENRE_TEXT[locale] ?? GENRE_TEXT.en;
  return ANIME_GENRES.map((g) => ({
    ...g,
    label: text[g.id].label,
    description: text[g.id].description,
  }));
}
