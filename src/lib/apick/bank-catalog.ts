import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

/** Apick 1원 인증 — 한국 금융기관 카탈로그 (UI + API 코드) */

export type BankCatalogGroup =
  | "quick"
  | "commercial"
  | "internet"
  | "regional"
  | "securities"
  | "other";

export type BankCatalogEntry = {
  code: string;
  name: string;
  nameEn: string;
  group: BankCatalogGroup;
  /** 상단 퀵 셀렉트 (7개) */
  quickPick: boolean;
  /** 검색용 키워드 */
  keywords: string[];
  /** Apick transfer_1won / account_realname 지원 */
  apickSupported: boolean;
};

export type IntlBankPreview = {
  region: "JP" | "US";
  name: string;
  nameEn: string;
  note: string;
};

/** 🇰🇷 Apick 연동 가능 — code는 Apick bank_code */
export const KR_BANK_CATALOG: BankCatalogEntry[] = [
  // Quick pick (7)
  {
    code: "004",
    name: t("lib.apick.s1n6my6n"),
    nameEn: "KB Kookmin",
    group: "quick",
    quickPick: true,
    keywords: [t("lib.apick.suj3j"), "kb", "kookmin", t("lib.apick.smnyvg8")],
    apickSupported: true,
  },
  {
    code: "088",
    name: t("lib.apick.sph2tad"),
    nameEn: "Shinhan",
    group: "quick",
    quickPick: true,
    keywords: [t("lib.apick.sybgc"), "shinhan"],
    apickSupported: true,
  },
  {
    code: "081",
    name: t("lib.apick.srnjw5l"),
    nameEn: "Hana",
    group: "quick",
    quickPick: true,
    keywords: [t("lib.apick.s119a8"), "hana"],
    apickSupported: true,
  },
  {
    code: "020",
    name: t("lib.apick.spuc0n9"),
    nameEn: "Woori",
    group: "quick",
    quickPick: true,
    keywords: [t("lib.apick.sytbw"), "woori"],
    apickSupported: true,
  },
  {
    code: "011",
    name: t("lib.apick.s1pbme5j"),
    nameEn: "NH NongHyup",
    group: "quick",
    quickPick: true,
    keywords: [t("lib.apick.svdic"), "nh", "nonghyup", t("lib.apick.snaiood")],
    apickSupported: true,
  },
  {
    code: "090",
    name: t("lib.apick.s1gravzf"),
    nameEn: "Kakao Bank",
    group: "quick",
    quickPick: true,
    keywords: [t("lib.apick.sv8tr8"), "kakao", t("lib.apick.s1gravzf")],
    apickSupported: true,
  },
  {
    code: "092",
    name: t("lib.apick.sr99a6j"),
    nameEn: "Toss Bank",
    group: "quick",
    quickPick: true,
    keywords: [t("lib.apick.s10q2s"), "toss", t("lib.apick.sr99a6j")],
    apickSupported: true,
  },

  // 시중·특수
  {
    code: "003",
    name: t("lib.apick.ibk"),
    nameEn: "IBK",
    group: "commercial",
    quickPick: false,
    keywords: [t("lib.apick.supp1"), "ibk", t("lib.apick.smsuzdq")],
    apickSupported: true,
  },
  {
    code: "023",
    name: t("lib.apick.s1uee4c9"),
    nameEn: "SC Cheil",
    group: "commercial",
    quickPick: false,
    keywords: ["sc", t("lib.apick.sz4rk"), t("lib.apick.s32lo0"), "standard chartered"],
    apickSupported: true,
  },
  {
    code: "007",
    name: t("lib.apick.spdmu4i"),
    nameEn: "Suhyup",
    group: "commercial",
    quickPick: false,
    keywords: [t("lib.apick.sy6t5"), "suhyup"],
    apickSupported: true,
  },
  {
    code: "002",
    name: t("lib.apick.kdb"),
    nameEn: "KDB",
    group: "commercial",
    quickPick: false,
    keywords: [t("lib.apick.sxuz9"), "kdb", t("lib.apick.sp4v19a")],
    apickSupported: true,
  },
  {
    code: "027",
    name: t("lib.apick.s1ygdcte"),
    nameEn: "Citibank Korea",
    group: "commercial",
    quickPick: false,
    keywords: [t("lib.apick.syoy0"), "citi", "citibank", t("lib.apick.srn5deh")],
    apickSupported: true,
  },

  // 인터넷전문
  {
    code: "089",
    name: t("lib.apick.sqy1kjf"),
    nameEn: "K Bank",
    group: "internet",
    quickPick: false,
    keywords: [t("lib.apick.s10ayc"), "kbank", t("lib.apick.sqy1kjf")],
    apickSupported: true,
  },

  // 지방
  {
    code: "032",
    name: t("lib.apick.bnk"),
    nameEn: "BNK Busan",
    group: "regional",
    quickPick: false,
    keywords: [t("lib.apick.sxagg"), "bnk", t("lib.apick.sopn795")],
    apickSupported: true,
  },
  {
    code: "039",
    name: t("lib.apick.bnk_2"),
    nameEn: "BNK Gyeongnam",
    group: "regional",
    quickPick: false,
    keywords: [t("lib.apick.sucnf"), "bnk", t("lib.apick.smj6rdg")],
    apickSupported: true,
  },
  {
    code: "031",
    name: t("lib.apick.sj7q7vk"),
    nameEn: "iM Bank",
    group: "regional",
    quickPick: false,
    keywords: [t("lib.apick.svecs"), "im", t("lib.apick.s2ugh7"), "dgb", t("lib.apick.stv6sw")],
    apickSupported: true,
  },
  {
    code: "037",
    name: t("lib.apick.sq0xbly"),
    nameEn: "Jeonbuk",
    group: "regional",
    quickPick: false,
    keywords: [t("lib.apick.sz27x"), "jeonbuk"],
    apickSupported: true,
  },
  {
    code: "034",
    name: t("lib.apick.smo8oes"),
    nameEn: "Gwangju",
    group: "regional",
    quickPick: false,
    keywords: [t("lib.apick.sujgr"), "gwangju"],
    apickSupported: true,
  },
  {
    code: "035",
    name: t("lib.apick.sq316ll"),
    nameEn: "Jeju",
    group: "regional",
    quickPick: false,
    keywords: [t("lib.apick.sz528"), "jeju"],
    apickSupported: true,
  },

  // 증권 (CMA/종합계좌)
  {
    code: "238",
    name: t("lib.apick.sfxv4dm"),
    nameEn: "Mirae Asset",
    group: "securities",
    quickPick: false,
    keywords: [t("lib.apick.swza8"), t("lib.apick.sohclcr"), "mirae"],
    apickSupported: true,
  },
  {
    code: "240",
    name: t("lib.apick.sp4eqmc"),
    nameEn: "Samsung Securities",
    group: "securities",
    quickPick: false,
    keywords: [t("lib.apick.sxud1"), t("lib.apick.sp4eqmc"), "samsung"],
    apickSupported: true,
  },
  {
    code: "247",
    name: t("lib.apick.s1tdmey5"),
    nameEn: "NH Investment",
    group: "securities",
    quickPick: false,
    keywords: [t("lib.apick.s3182m"), t("lib.apick.s9zjokt"), t("lib.apick.snaiv8z")],
    apickSupported: true,
  },
  {
    code: "243",
    name: t("lib.apick.s10p2f8"),
    nameEn: "Korea Investment",
    group: "securities",
    quickPick: false,
    keywords: [t("lib.apick.s11g0g"), t("lib.apick.srn7iut"), "korea investment"],
    apickSupported: true,
  },
  {
    code: "218",
    name: t("lib.apick.s2cht2"),
    nameEn: "KB Securities",
    group: "securities",
    quickPick: false,
    keywords: [t("lib.apick.s2xl46"), "kb sec"],
    apickSupported: true,
  },
  {
    code: "278",
    name: t("lib.apick.s1blvtv3"),
    nameEn: "Shinhan Investment",
    group: "securities",
    quickPick: false,
    keywords: [t("lib.apick.sph4leo"), t("lib.apick.sph2zuz")],
    apickSupported: true,
  },
  {
    code: "264",
    name: t("lib.apick.sr5g4dn"),
    nameEn: "Kiwoom",
    group: "securities",
    quickPick: false,
    keywords: [t("lib.apick.s10kv0"), "kiwoom"],
    apickSupported: true,
  },
  {
    code: "271",
    name: t("lib.apick.sr9bd03"),
    nameEn: "Toss Securities",
    group: "securities",
    quickPick: false,
    keywords: [t("lib.apick.sr9bd03"), "toss sec"],
    apickSupported: true,
  },

  // 기타 금융
  {
    code: "045",
    name: t("lib.apick.s1vq79y4"),
    nameEn: "Saemaul Geumgo",
    group: "other",
    quickPick: false,
    keywords: [t("lib.apick.st583o"), "mg", t("lib.apick.s1vq79y4")],
    apickSupported: true,
  },
  {
    code: "071",
    name: t("lib.marketplace.su3g15"),
    nameEn: "Post Office",
    group: "other",
    quickPick: false,
    keywords: [t("lib.marketplace.su3g15"), "post"],
    apickSupported: true,
  },
  {
    code: "048",
    name: t("lib.apick.sybld"),
    nameEn: "Credit Union",
    group: "other",
    quickPick: false,
    keywords: [t("lib.apick.sybld"), "cu"],
    apickSupported: true,
  },
  {
    code: "050",
    name: t("lib.apick.sq37jq6"),
    nameEn: "Savings Bank",
    group: "other",
    quickPick: false,
    keywords: [t("lib.apick.sz5at"), "savings"],
    apickSupported: true,
  },
  {
    code: "012",
    name: t("lib.apick.sybazv7"),
    nameEn: "Nonghyup local",
    group: "other",
    quickPick: false,
    keywords: [t("lib.apick.sr0d49"), t("lib.apick.s1055o"), t("lib.apick.sq9xjpt")],
    apickSupported: true,
  },
  {
    code: "064",
    name: t("lib.apick.st1ex33"),
    nameEn: "Forestry Cooperative",
    group: "other",
    quickPick: false,
    keywords: [t("lib.apick.sxslo"), t("lib.apick.sp33rwl")],
    apickSupported: true,
  },
  {
    code: "055",
    name: t("lib.apick.sildh0x"),
    nameEn: "Deutsche Bank",
    group: "other",
    quickPick: false,
    keywords: [t("lib.apick.srayi0"), "deutsche"],
    apickSupported: true,
  },
  {
    code: "057",
    name: t("lib.apick.sg3opqz"),
    nameEn: "JPMorgan Chase",
    group: "other",
    quickPick: false,
    keywords: [t("lib.apick.s2uope"), "jpmorgan", "chase"],
    apickSupported: true,
  },
  {
    code: "061",
    name: t("lib.apick.bnp"),
    nameEn: "BNP Paribas",
    group: "other",
    quickPick: false,
    keywords: ["bnp", t("lib.apick.svtgj8")],
    apickSupported: true,
  },
  {
    code: "060",
    name: t("lib.apick.boa"),
    nameEn: "Bank of America",
    group: "other",
    quickPick: false,
    keywords: ["boa", "bofa", t("lib.apick.s1c4ychz"), "america"],
    apickSupported: true,
  },
  {
    code: "054",
    name: t("lib.apick.hsbc"),
    nameEn: "HSBC",
    group: "other",
    quickPick: false,
    keywords: ["hsbc"],
    apickSupported: true,
  },
];

/** UI placeholder removed — overseas seller payout is Stripe Connect only (Rail B deferred). */
export const INTL_BANK_PREVIEW: IntlBankPreview[] = [];

const CATALOG_BY_CODE = new Map(KR_BANK_CATALOG.map((b) => [b.code, b]));

export function getKrBankCatalogEntry(code: string): BankCatalogEntry | undefined {
  return CATALOG_BY_CODE.get(code);
}

export function getKrQuickPickBanks(): BankCatalogEntry[] {
  return KR_BANK_CATALOG.filter((b) => b.quickPick);
}

export function getKrBanksByGroup(group: BankCatalogGroup): BankCatalogEntry[] {
  if (group === "quick") return getKrQuickPickBanks();
  return KR_BANK_CATALOG.filter((b) => b.group === group);
}

export function searchKrBanks(query: string): BankCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return KR_BANK_CATALOG;
  return KR_BANK_CATALOG.filter((b) => {
    const hay = [b.name, b.nameEn, b.code, ...b.keywords].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export const BANK_GROUP_LABELS: Record<BankCatalogGroup, { ko: string; en: string }> = {
  quick: { ko: t("lib.apick.s1jnaqa9"), en: "Popular" },
  commercial: { ko: t("lib.apick.swx7smi"), en: "Commercial" },
  internet: { ko: t("lib.apick.s1ofdwjg"), en: "Internet banks" },
  regional: { ko: t("lib.apick.sq8lqpe"), en: "Regional" },
  securities: { ko: t("lib.apick.cma"), en: "Securities" },
  other: { ko: t("lib.apick.s1veut71"), en: "Other" },
};

/** Apick API bank_code → 표시명 (레거시 호환) */
export function buildApickBankCodeMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const b of KR_BANK_CATALOG) {
    if (b.apickSupported) map[b.code] = b.name;
  }
  return map;
}

export function apickBankDisplayName(code: string): string | null {
  return CATALOG_BY_CODE.get(code)?.name ?? null;
}

export function isApickBankCode(code: string): boolean {
  const entry = CATALOG_BY_CODE.get(code);
  return !!entry?.apickSupported;
}

export function normalizeBankAccountNum(raw: string): string {
  return raw.replace(/\D/g, "");
}
