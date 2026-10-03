/**
 * Korean catalog labels stored on listings (server parity). Not UI copy.
 */
export const USED_CATEGORIES = [
  { id: "FIGURE", label: "피규어 / 인형" },
  { id: "TCG", label: "TCG / 카드" },
  { id: "GOODS", label: "캐릭터 굿즈" },
  { id: "BOOK", label: "도서 / 미디어" },
  { id: "COSPLAY_FASHION", label: "코스프레 / 패션" },
  { id: "DIGITAL", label: "디지털 / 가전" },
] as const;

/** Sell-form product kinds — same ids as the list categories. */
export const USED_SELL_KINDS = [
  { id: "FIGURE", label: "피규어" },
  { id: "TCG", label: "TCG" },
  { id: "GOODS", label: "굿즈" },
  { id: "BOOK", label: "도서" },
  { id: "COSPLAY", label: "코스프레" },
  { id: "DIGITAL", label: "디지털" },
] as const;

export const USED_PRODUCT_TYPES = [
  { id: "FIGURE", label: "피규어" },
  { id: "PLAMODEL", label: "프라모델" },
  { id: "PLUSH", label: "인형·봉제" },
  { id: "STATUE", label: "등신대·스태츄" },
  { id: "ACRYLIC_STAND", label: "아크릴 스탠드" },
  { id: "CAN_BADGE", label: "캔뱃지" },
  { id: "KEYRING", label: "키링" },
  { id: "COSPLAY_COSTUME", label: "코스프레 의상" },
  { id: "WIG", label: "가발" },
  { id: "TCG_CARD", label: "카드 (TCG·일반)" },
  { id: "TCG_POKEMON", label: "포켓몬 카드" },
  { id: "TCG_YGO", label: "유희왕" },
  { id: "TCG_MTG", label: "매직 (MTG)" },
  { id: "TCG_ONEPIECE", label: "원피스 카드" },
  { id: "TCG_OTHER", label: "기타 TCG" },
  { id: "PHOTOCARD", label: "포토카드" },
  { id: "DOUJIN", label: "동인지" },
  { id: "ARTBOOK", label: "아트북" },
  { id: "BOARDGAME", label: "보드게임" },
  { id: "VTUBER_GOODS", label: "VTuber 굿즈" },
  { id: "EVENT_GOODS", label: "행사·한정 굿즈" },
  { id: "BOOK", label: "만화·라노벨" },
  { id: "MEDIA", label: "CD/DVD/블루레이" },
  { id: "OTHER", label: "기타" },
] as const;

export const USED_CONDITION_GRADES = [
  { id: "NEW", label: "미개봉·신품급" },
  { id: "LIKE_NEW", label: "거의 새것" },
  { id: "NM", label: "NM (Near Mint)" },
  { id: "LP", label: "LP (Light Played)" },
  { id: "MP", label: "MP (Moderate Played)" },
  { id: "HP", label: "HP (Heavy Played)" },
  { id: "POOR", label: "손상·하자 있음" },
  { id: "UNKNOWN", label: "상태 미표기" },
] as const;

export const USED_LIMITED_KINDS = [
  { id: "EVENT_EXCLUSIVE", label: "행사 한정" },
  { id: "VENUE_ONLY", label: "회장한정·현장 only" },
  { id: "PREORDER", label: "예약·선주문" },
  { id: "COLLAB", label: "콜라보·한정" },
  { id: "LIMITED_RUN", label: "한정 수량" },
  { id: "LOTTERY", label: "추첨·kuji" },
  { id: "PROMO", label: "프로모·특전" },
] as const;

export const USED_TRADE_MODES = [
  { id: "TRADE", label: "교환만 (WTT)" },
  { id: "SELL_OR_TRADE", label: "판매·교환" },
] as const;

