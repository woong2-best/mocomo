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
    name: "KB국민은행",
    nameEn: "KB Kookmin",
    group: "quick",
    quickPick: true,
    keywords: ["국민", "kb", "kookmin", "국민은행"],
    apickSupported: true,
  },
  {
    code: "088",
    name: "신한은행",
    nameEn: "Shinhan",
    group: "quick",
    quickPick: true,
    keywords: ["신한", "shinhan"],
    apickSupported: true,
  },
  {
    code: "081",
    name: "하나은행",
    nameEn: "Hana",
    group: "quick",
    quickPick: true,
    keywords: ["하나", "hana"],
    apickSupported: true,
  },
  {
    code: "020",
    name: "우리은행",
    nameEn: "Woori",
    group: "quick",
    quickPick: true,
    keywords: ["우리", "woori"],
    apickSupported: true,
  },
  {
    code: "011",
    name: "NH농협은행",
    nameEn: "NH NongHyup",
    group: "quick",
    quickPick: true,
    keywords: ["농협", "nh", "nonghyup", "농협은행"],
    apickSupported: true,
  },
  {
    code: "090",
    name: "카카오뱅크",
    nameEn: "Kakao Bank",
    group: "quick",
    quickPick: true,
    keywords: ["카카오", "kakao", "카카오뱅크"],
    apickSupported: true,
  },
  {
    code: "092",
    name: "토스뱅크",
    nameEn: "Toss Bank",
    group: "quick",
    quickPick: true,
    keywords: ["토스", "toss", "토스뱅크"],
    apickSupported: true,
  },

  // 시중·특수
  {
    code: "003",
    name: "IBK기업은행",
    nameEn: "IBK",
    group: "commercial",
    quickPick: false,
    keywords: ["기업", "ibk", "기업은행"],
    apickSupported: true,
  },
  {
    code: "023",
    name: "SC제일은행",
    nameEn: "SC Cheil",
    group: "commercial",
    quickPick: false,
    keywords: ["sc", "제일", "sc제일", "standard chartered"],
    apickSupported: true,
  },
  {
    code: "007",
    name: "수협은행",
    nameEn: "Suhyup",
    group: "commercial",
    quickPick: false,
    keywords: ["수협", "suhyup"],
    apickSupported: true,
  },
  {
    code: "002",
    name: "KDB산업은행",
    nameEn: "KDB",
    group: "commercial",
    quickPick: false,
    keywords: ["산업", "kdb", "산업은행"],
    apickSupported: true,
  },
  {
    code: "027",
    name: "한국씨티은행",
    nameEn: "Citibank Korea",
    group: "commercial",
    quickPick: false,
    keywords: ["씨티", "citi", "citibank", "한국씨티"],
    apickSupported: true,
  },

  // 인터넷전문
  {
    code: "089",
    name: "케이뱅크",
    nameEn: "K Bank",
    group: "internet",
    quickPick: false,
    keywords: ["케이", "kbank", "케이뱅크"],
    apickSupported: true,
  },

  // 지방
  {
    code: "032",
    name: "BNK부산은행",
    nameEn: "BNK Busan",
    group: "regional",
    quickPick: false,
    keywords: ["부산", "bnk", "부산은행"],
    apickSupported: true,
  },
  {
    code: "039",
    name: "BNK경남은행",
    nameEn: "BNK Gyeongnam",
    group: "regional",
    quickPick: false,
    keywords: ["경남", "bnk", "경남은행"],
    apickSupported: true,
  },
  {
    code: "031",
    name: "iM뱅크(대구)",
    nameEn: "iM Bank",
    group: "regional",
    quickPick: false,
    keywords: ["대구", "im", "im뱅크", "dgb", "아이엠"],
    apickSupported: true,
  },
  {
    code: "037",
    name: "전북은행",
    nameEn: "Jeonbuk",
    group: "regional",
    quickPick: false,
    keywords: ["전북", "jeonbuk"],
    apickSupported: true,
  },
  {
    code: "034",
    name: "광주은행",
    nameEn: "Gwangju",
    group: "regional",
    quickPick: false,
    keywords: ["광주", "gwangju"],
    apickSupported: true,
  },
  {
    code: "035",
    name: "제주은행",
    nameEn: "Jeju",
    group: "regional",
    quickPick: false,
    keywords: ["제주", "jeju"],
    apickSupported: true,
  },

  // 증권 (CMA/종합계좌)
  {
    code: "238",
    name: "미래에셋증권",
    nameEn: "Mirae Asset",
    group: "securities",
    quickPick: false,
    keywords: ["미래", "미래에셋", "mirae"],
    apickSupported: true,
  },
  {
    code: "240",
    name: "삼성증권",
    nameEn: "Samsung Securities",
    group: "securities",
    quickPick: false,
    keywords: ["삼성", "삼성증권", "samsung"],
    apickSupported: true,
  },
  {
    code: "247",
    name: "NH투자증권",
    nameEn: "NH Investment",
    group: "securities",
    quickPick: false,
    keywords: ["nh투자", "nh투자증권", "농협증권"],
    apickSupported: true,
  },
  {
    code: "243",
    name: "한국투자증권",
    nameEn: "Korea Investment",
    group: "securities",
    quickPick: false,
    keywords: ["한투", "한국투자", "korea investment"],
    apickSupported: true,
  },
  {
    code: "218",
    name: "KB증권",
    nameEn: "KB Securities",
    group: "securities",
    quickPick: false,
    keywords: ["kb증권", "kb sec"],
    apickSupported: true,
  },
  {
    code: "278",
    name: "신한투자증권",
    nameEn: "Shinhan Investment",
    group: "securities",
    quickPick: false,
    keywords: ["신한투자", "신한증권"],
    apickSupported: true,
  },
  {
    code: "264",
    name: "키움증권",
    nameEn: "Kiwoom",
    group: "securities",
    quickPick: false,
    keywords: ["키움", "kiwoom"],
    apickSupported: true,
  },
  {
    code: "271",
    name: "토스증권",
    nameEn: "Toss Securities",
    group: "securities",
    quickPick: false,
    keywords: ["토스증권", "toss sec"],
    apickSupported: true,
  },

  // 기타 금융
  {
    code: "045",
    name: "새마을금고",
    nameEn: "Saemaul Geumgo",
    group: "other",
    quickPick: false,
    keywords: ["새마을", "mg", "새마을금고"],
    apickSupported: true,
  },
  {
    code: "071",
    name: "우체국",
    nameEn: "Post Office",
    group: "other",
    quickPick: false,
    keywords: ["우체국", "post"],
    apickSupported: true,
  },
  {
    code: "048",
    name: "신협",
    nameEn: "Credit Union",
    group: "other",
    quickPick: false,
    keywords: ["신협", "cu"],
    apickSupported: true,
  },
  {
    code: "050",
    name: "저축은행",
    nameEn: "Savings Bank",
    group: "other",
    quickPick: false,
    keywords: ["저축", "savings"],
    apickSupported: true,
  },
  {
    code: "012",
    name: "지역농·축협",
    nameEn: "Nonghyup local",
    group: "other",
    quickPick: false,
    keywords: ["농축협", "축협", "지역농협"],
    apickSupported: true,
  },
  {
    code: "064",
    name: "산림조합중앙회",
    nameEn: "Forestry Cooperative",
    group: "other",
    quickPick: false,
    keywords: ["산림", "산림조합"],
    apickSupported: true,
  },
  {
    code: "055",
    name: "도이치은행",
    nameEn: "Deutsche Bank",
    group: "other",
    quickPick: false,
    keywords: ["도이치", "deutsche"],
    apickSupported: true,
  },
  {
    code: "057",
    name: "JP모건체이스은행",
    nameEn: "JPMorgan Chase",
    group: "other",
    quickPick: false,
    keywords: ["jp모건", "jpmorgan", "chase"],
    apickSupported: true,
  },
  {
    code: "061",
    name: "BNP파리바은행",
    nameEn: "BNP Paribas",
    group: "other",
    quickPick: false,
    keywords: ["bnp", "파리바"],
    apickSupported: true,
  },
  {
    code: "060",
    name: "BOA(뱅크오브아메리카)",
    nameEn: "Bank of America",
    group: "other",
    quickPick: false,
    keywords: ["boa", "bofa", "뱅크오브아메리카", "america"],
    apickSupported: true,
  },
  {
    code: "054",
    name: "HSBC은행",
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
  quick: { ko: "자주 쓰는 은행", en: "Popular" },
  commercial: { ko: "시중·특수은행", en: "Commercial" },
  internet: { ko: "인터넷전문은행", en: "Internet banks" },
  regional: { ko: "지방은행", en: "Regional" },
  securities: { ko: "증권사 (CMA/종합)", en: "Securities" },
  other: { ko: "기타 금융기관", en: "Other" },
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
