/** Mobile — KR bank catalog (sync with src/lib/apick/bank-catalog.ts) */

export type MobileBankEntry = {
  code: string;
  name: string;
  shortName: string;
  quickPick: boolean;
  keywords: string[];
  group: string;
};

export const KR_BANKS: MobileBankEntry[] = [
  { code: "004", name: "KB국민은행", shortName: "국민", quickPick: true, keywords: ["국민", "kb"], group: "quick" },
  { code: "088", name: "신한은행", shortName: "신한", quickPick: true, keywords: ["신한"], group: "quick" },
  { code: "081", name: "하나은행", shortName: "하나", quickPick: true, keywords: ["하나"], group: "quick" },
  { code: "020", name: "우리은행", shortName: "우리", quickPick: true, keywords: ["우리"], group: "quick" },
  { code: "011", name: "NH농협은행", shortName: "농협", quickPick: true, keywords: ["농협", "nh"], group: "quick" },
  { code: "090", name: "카카오뱅크", shortName: "카카오", quickPick: true, keywords: ["카카오"], group: "quick" },
  { code: "092", name: "토스뱅크", shortName: "토스", quickPick: true, keywords: ["토스"], group: "quick" },
  { code: "003", name: "IBK기업은행", shortName: "기업", quickPick: false, keywords: ["기업", "ibk"], group: "commercial" },
  { code: "023", name: "SC제일은행", shortName: "SC제일", quickPick: false, keywords: ["sc", "제일"], group: "commercial" },
  { code: "007", name: "수협은행", shortName: "수협", quickPick: false, keywords: ["수협"], group: "commercial" },
  { code: "002", name: "KDB산업은행", shortName: "산업", quickPick: false, keywords: ["산업", "kdb"], group: "commercial" },
  { code: "027", name: "한국씨티은행", shortName: "씨티", quickPick: false, keywords: ["씨티", "citi"], group: "commercial" },
  { code: "089", name: "케이뱅크", shortName: "케이", quickPick: false, keywords: ["케이"], group: "internet" },
  { code: "032", name: "BNK부산은행", shortName: "부산", quickPick: false, keywords: ["부산"], group: "regional" },
  { code: "039", name: "BNK경남은행", shortName: "경남", quickPick: false, keywords: ["경남"], group: "regional" },
  { code: "031", name: "iM뱅크(대구)", shortName: "iM", quickPick: false, keywords: ["대구", "im"], group: "regional" },
  { code: "037", name: "전북은행", shortName: "전북", quickPick: false, keywords: ["전북"], group: "regional" },
  { code: "034", name: "광주은행", shortName: "광주", quickPick: false, keywords: ["광주"], group: "regional" },
  { code: "035", name: "제주은행", shortName: "제주", quickPick: false, keywords: ["제주"], group: "regional" },
  { code: "238", name: "미래에셋증권", shortName: "미래", quickPick: false, keywords: ["미래", "미래에셋"], group: "securities" },
  { code: "240", name: "삼성증권", shortName: "삼성", quickPick: false, keywords: ["삼성"], group: "securities" },
  { code: "247", name: "NH투자증권", shortName: "NH투자", quickPick: false, keywords: ["nh투자"], group: "securities" },
  { code: "243", name: "한국투자증권", shortName: "한투", quickPick: false, keywords: ["한투", "한국투자"], group: "securities" },
  { code: "218", name: "KB증권", shortName: "KB증권", quickPick: false, keywords: ["kb증권"], group: "securities" },
  { code: "278", name: "신한투자증권", shortName: "신한투자", quickPick: false, keywords: ["신한투자"], group: "securities" },
  { code: "264", name: "키움증권", shortName: "키움", quickPick: false, keywords: ["키움"], group: "securities" },
  { code: "271", name: "토스증권", shortName: "토스증권", quickPick: false, keywords: ["토스증권"], group: "securities" },
  { code: "045", name: "새마을금고", shortName: "새마을", quickPick: false, keywords: ["새마을"], group: "other" },
  { code: "071", name: "우체국", shortName: "우체국", quickPick: false, keywords: ["우체국"], group: "other" },
  { code: "048", name: "신협", shortName: "신협", quickPick: false, keywords: ["신협"], group: "other" },
  { code: "050", name: "저축은행", shortName: "저축", quickPick: false, keywords: ["저축"], group: "other" },
  { code: "012", name: "지역농·축협", shortName: "농축협", quickPick: false, keywords: ["농축협"], group: "other" },
  { code: "064", name: "산림조합", shortName: "산림", quickPick: false, keywords: ["산림"], group: "other" },
  { code: "055", name: "도이치은행", shortName: "도이치", quickPick: false, keywords: ["도이치"], group: "other" },
  { code: "057", name: "JP모건", shortName: "JP모건", quickPick: false, keywords: ["jp모건"], group: "other" },
  { code: "061", name: "BNP파리바", shortName: "BNP", quickPick: false, keywords: ["bnp"], group: "other" },
  { code: "060", name: "BOA", shortName: "BOA", quickPick: false, keywords: ["boa", "bofa"], group: "other" },
  { code: "054", name: "HSBC", shortName: "HSBC", quickPick: false, keywords: ["hsbc"], group: "other" },
];

export function getQuickPickBanks() {
  return KR_BANKS.filter((b) => b.quickPick);
}

export function searchKrBanks(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return KR_BANKS;
  return KR_BANKS.filter((b) => {
    const hay = [b.name, b.shortName, b.code, ...b.keywords].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function getBankByCode(code: string) {
  return KR_BANKS.find((b) => b.code === code);
}

/** @deprecated */
export const APICK_BANK_OPTIONS = KR_BANKS.map((b) => ({ code: b.code, name: b.name }));
