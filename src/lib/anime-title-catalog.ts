import type { Locale } from "@/lib/i18n/config";

export type AnimeTitleLocalization = {
  ko: string;
  en: string;
  ja: string;
  zh: string;
};

function catalogLocale(locale: Locale): keyof AnimeTitleLocalization {
  if (locale === "ko") return "ko";
  if (locale === "ja") return "ja";
  if (locale === "zh" || locale === "zh-TW") return "zh";
  return "en";
}

/** 위키 시드·인기작 공식 표기 (사이드바 탑10 등) */
const ANIME_TITLE_CATALOG: AnimeTitleLocalization[] = [
  {
    ko: "Kabaneri of the Iron Fortress",
    en: "Kabaneri of the Iron Fortress",
    ja: "甲鉄城のカバネリ",
    zh: "甲铁城的卡巴内瑞",
  },
  {
    ko: "Demon Slayer",
    en: "Demon Slayer Kimetsu no Yaiba",
    ja: "鬼滅の刃",
    zh: "鬼灭之刃",
  },
  {
    ko: "Attack on Titan",
    en: "Attack on Titan",
    ja: "進撃の巨人",
    zh: "进击的巨人",
  },
  {
    ko: "My Dress-Up Darling",
    en: "My Dress-Up Darling",
    ja: "その着せ替え人形は恋をする",
    zh: "更衣人偶坠入爱河",
  },
  {
    ko: "Your Name.",
    en: "Your Name",
    ja: "君の名は。",
    zh: "你的名字。",
  },
  {
    ko: "Toradora!",
    en: "Toradora",
    ja: "とらドラ！",
    zh: "龙与虎",
  },
  {
    ko: "K-On!",
    en: "K-On",
    ja: "けいおん！",
    zh: "轻音少女",
  },
  {
    ko: "Spy x Family",
    en: "Spy x Family",
    ja: "スパイファミリー",
    zh: "间谍过家家",
  },
  {
    ko: "Frieren: Beyond Journey's End",
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
    ko: "Steins;Gate",
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
    ko: "Bocchi the Rock!",
    en: "Bocchi the Rock",
    ja: "ぼっち・ざ・ろっく！",
    zh: "孤独摇滚！",
  },
  {
    ko: "Bocchi the Rock!",
    en: "Bocchi the Rock",
    ja: "ぼっち・ざ・ろっく！",
    zh: "孤独摇滚！",
  },
  {
    ko: "Violet Evergarden",
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
    ko: "Parasyte",
    en: "Parasyte",
    ja: "寄生獣",
    zh: "寄生兽",
  },
  {
    ko: "Haikyu!!",
    en: "Haikyuu",
    ja: "ハイキュー!!",
    zh: "排球少年!!",
  },
  {
    ko: "Blue Lock",
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
  const lang = catalogLocale(locale);
  const byTitle = byKo.get(norm(anime.title));
  if (byTitle) return byTitle[lang];
  const en = anime.titleEn?.trim();
  if (en) {
    const byEnglish = byEn.get(norm(en));
    if (byEnglish) return byEnglish[lang];
  }
  return null;
}
