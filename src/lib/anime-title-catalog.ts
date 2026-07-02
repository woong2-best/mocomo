import type { Locale } from "@/lib/i18n/config";

export type AnimeTitleLocalization = {
  ko: string;
  en: string;
  ja: string;
  zh: string;
};

/** 위키 시드·인기작 공식 표기 (사이드바 탑10 등) */
const ANIME_TITLE_CATALOG: AnimeTitleLocalization[] = [
  {
    ko: "갑철성의 카바네리",
    en: "Kabaneri of the Iron Fortress",
    ja: "甲鉄城のカバネリ",
    zh: "甲铁城的卡巴内瑞",
  },
  {
    ko: "귀멸의 칼날",
    en: "Demon Slayer Kimetsu no Yaiba",
    ja: "鬼滅の刃",
    zh: "鬼灭之刃",
  },
  {
    ko: "진격의 거인",
    en: "Attack on Titan",
    ja: "進撃の巨人",
    zh: "进击的巨人",
  },
  {
    ko: "그 비스크 돌은 사랑을 한다",
    en: "My Dress-Up Darling",
    ja: "その着せ替え人形は恋をする",
    zh: "更衣人偶坠入爱河",
  },
  {
    ko: "너의 이름은.",
    en: "Your Name",
    ja: "君の名は。",
    zh: "你的名字。",
  },
  {
    ko: "토라도라!",
    en: "Toradora",
    ja: "とらドラ！",
    zh: "龙与虎",
  },
  {
    ko: "케이온!",
    en: "K-On",
    ja: "けいおん！",
    zh: "轻音少女",
  },
  {
    ko: "스파이 패밀리",
    en: "Spy x Family",
    ja: "スパイファミリー",
    zh: "间谍过家家",
  },
  {
    ko: "장송의 프리렌",
    en: "Frieren Beyond Journeys End",
    ja: "葬送のフリーレン",
    zh: "葬送的芙莉莲",
  },
  {
    ko: "Re:ゼロから始める異世界生活",
    en: "Re Zero Starting Life in Another World",
    ja: "Re:ゼロから始める異世界生活",
    zh: "Re:从零开始的异世界生活",
  },
  {
    ko: "슈타인즈 게이트",
    en: "Steins Gate",
    ja: "STEINS;GATE",
    zh: "命运石之门",
  },
  {
    ko: "PSYCHO-PASS",
    en: "Psycho-Pass",
    ja: "PSYCHO-PASS サイコパス",
    zh: "心理测量者",
  },
  {
    ko: "보치 더 록!",
    en: "Bocchi the Rock",
    ja: "ぼっち・ざ・ろっく！",
    zh: "孤独摇滚！",
  },
  {
    ko: "봇치 더 록!",
    en: "Bocchi the Rock",
    ja: "ぼっち・ざ・ろっく！",
    zh: "孤独摇滚！",
  },
  {
    ko: "바이올렛 에버가든",
    en: "Violet Evergarden",
    ja: "ヴァイオレット・エヴァーガーデン",
    zh: "紫罗兰永恒花园",
  },
  {
    ko: "Another",
    en: "Another",
    ja: "Another",
    zh: "Another",
  },
  {
    ko: "기생수",
    en: "Parasyte",
    ja: "寄生獣",
    zh: "寄生兽",
  },
  {
    ko: "하이큐!!",
    en: "Haikyuu",
    ja: "ハイキュー!!",
    zh: "排球少年!!",
  },
  {
    ko: "블루 록",
    en: "Blue Lock",
    ja: "ブルーロック",
    zh: "蓝色监狱",
  },
];

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const byKo = new Map<string, AnimeTitleLocalization>();
const byEn = new Map<string, AnimeTitleLocalization>();

for (const entry of ANIME_TITLE_CATALOG) {
  byKo.set(norm(entry.ko), entry);
  byEn.set(norm(entry.en), entry);
}

export type AnimeTitleFields = {
  title: string;
  titleEn?: string | null;
  slug: string;
};

export function lookupAnimeTitleCatalog(
  anime: AnimeTitleFields,
  locale: Locale
): string | null {
  if (locale === "ko") return anime.title;
  const byTitle = byKo.get(norm(anime.title));
  if (byTitle) return byTitle[locale];
  const en = anime.titleEn?.trim();
  if (en) {
    const byEnglish = byEn.get(norm(en));
    if (byEnglish) return byEnglish[locale];
  }
  return null;
}
