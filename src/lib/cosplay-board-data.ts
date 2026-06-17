export type CosplayBoardMode = "rental" | "purchase";

export type CosplayBoardPost = {
  id: string;
  mode: CosplayBoardMode;
  title: string;
  author: string;
  createdAt: string;
  viewCount: number;
  commentCount: number;
  priceLabel: string;
  region?: string;
  isNotice?: boolean;
  content: string;
};

const rentalPosts: CosplayBoardPost[] = [
  {
    id: "rent-1",
    mode: "rental",
    title: "[대여] 블루 아카이브 아리사 풀셋 (가발·총·신발 포함)",
    author: "코스렌탈샵",
    createdAt: "06.18",
    viewCount: 842,
    commentCount: 12,
    priceLabel: "1일 25,000원",
    region: "서울 강남",
    isNotice: true,
    content:
      "사이즈 M 기준, 가발·총·신발·장갑 풀셋 대여합니다.\n\n· 1일 25,000원 / 3일 60,000원\n· 보증금 50,000원 (반납 확인 후 환불)\n· 직거래: 강남역 2번 출구\n· 세탁·수선 완료 상태",
  },
  {
    id: "rent-2",
    mode: "rental",
    title: "원신 나히다 풀셋 대여 (가발 O)",
    author: "코스빌리지",
    createdAt: "06.17",
    viewCount: 531,
    commentCount: 7,
    priceLabel: "1일 30,000원",
    region: "경기 수원",
    content:
      "나히다 풀셋 대여합니다. 가발 포함, 사이즈 S~M.\n\n· 1일 30,000원\n· 택배 가능 (왕복 택배비 별도)\n· 착용 전후 사진 필수",
  },
  {
    id: "rent-3",
    mode: "rental",
    title: "체인소맨 레제 의상 + 가발 대여",
    author: "레ntalQueen",
    createdAt: "06.17",
    viewCount: 412,
    commentCount: 4,
    priceLabel: "1일 18,000원",
    region: "부산 서면",
    content: "레제 코스프레 의상 + 가발 대여. 사이즈 Free.\n\n· 1일 18,000원\n· 부산 서면 직거래\n· 행사 당일 대여 문의 환영",
  },
  {
    id: "rent-4",
    mode: "rental",
    title: "[급구] 주말 행사용 마법소녀 세트 빌려주실 분",
    author: "행사러버",
    createdAt: "06.16",
    viewCount: 289,
    commentCount: 9,
    priceLabel: "협의",
    region: "대전",
    content:
      "이번 주 토요일 코스프레 행사 참가 예정입니다.\n마법소녀 계열 풀셋 대여 가능하신 분 연락 부탁드립니다.\n\n· 사이즈 M\n· 가발 포함 희망",
  },
  {
    id: "rent-5",
    mode: "rental",
    title: "프리렌 의상 + 지팡이 소품 대여",
    author: "엘프코스",
    createdAt: "06.15",
    viewCount: 367,
    commentCount: 3,
    priceLabel: "1일 22,000원",
    region: "인천",
    content: "프리렌 코스프레 의상 + 지팡이 소품 대여.\n\n· 1일 22,000원\n· 3일 이상 10% 할인\n· 인천 부평역 직거래",
  },
  {
    id: "rent-6",
    mode: "rental",
    title: "루피 기어5 버전 의상 대여 (가발 별도)",
    author: "원피스코스",
    createdAt: "06.14",
    viewCount: 198,
    commentCount: 2,
    priceLabel: "1일 15,000원",
    region: "서울 홍대",
    content: "원피스 루피 기어5 의상 대여. 가발은 별도 문의.\n\n· 1일 15,000원\n· 홍대입구역 직거래",
  },
  {
    id: "rent-7",
    mode: "rental",
    title: "스파이 패밀리 요르 의상 + 가발",
    author: "코스하우스",
    createdAt: "06.13",
    viewCount: 445,
    commentCount: 6,
    priceLabel: "1일 20,000원",
    region: "서울",
    content: "요르 포저 풀셋 대여. 사이즈 S.\n\n· 1일 20,000원\n· 가발·신발 포함\n· 당일 반납 시 5,000원 할인",
  },
  {
    id: "rent-8",
    mode: "rental",
    title: "페이트 세이버 아머 버전 (대형 소품 포함)",
    author: "세이버렌탈",
    createdAt: "06.12",
    viewCount: 612,
    commentCount: 11,
    priceLabel: "1일 45,000원",
    region: "경기 성남",
    content:
      "세이버 아머 버전 풀셋 + 검 소품 대여.\n\n· 1일 45,000원 (소형/대형 소품 포함)\n· 픽업만 가능 (차량 필요)\n· 행사 3일 전 예약 필수",
  },
];

const purchasePosts: CosplayBoardPost[] = [
  {
    id: "buy-1",
    mode: "purchase",
    title: "[판매] 원신 라이덴 쇼군 의상 M사이즈 (1회 착용)",
    author: "번개판매",
    createdAt: "06.18",
    viewCount: 723,
    commentCount: 8,
    priceLabel: "85,000원",
    region: "서울",
    isNotice: true,
    content:
      "라이덴 쇼군 의상 M사이즈 판매합니다.\n\n· 1회 착용, 세탁 완료\n· 가발 미포함\n· 85,000원 (네고 가능)\n· 택배/직거래 모두 가능",
  },
  {
    id: "buy-2",
    mode: "purchase",
    title: "체인소맨 파워 가발 + 의상 세트 판매",
    author: "파워코스",
    createdAt: "06.17",
    viewCount: 456,
    commentCount: 5,
    priceLabel: "55,000원",
    region: "경기",
    content: "파워 풀셋 (의상 + 가발) 판매.\n\n· 55,000원\n· 사이즈 Free\n· 상태 A급",
  },
  {
    id: "buy-3",
    mode: "purchase",
    title: "블루 아카이브 유우카 교복 세트",
    author: "키보토스마켓",
    createdAt: "06.17",
    viewCount: 334,
    commentCount: 3,
    priceLabel: "42,000원",
    region: "대구",
    content: "유우카 교복 세트 판매. 가발 별도.\n\n· 42,000원\n· 택배비 별도",
  },
  {
    id: "buy-4",
    mode: "purchase",
    title: "[급처] 마법소녀 코스프레 의상 일괄 (3벌)",
    author: "정리중",
    createdAt: "06.16",
    viewCount: 891,
    commentCount: 14,
    priceLabel: "120,000원",
    region: "서울",
    content:
      "마법소녀 계열 의상 3벌 일괄 판매.\n\n· 120,000원 (개별 판매 불가)\n· 사이즈 S~M\n· 가발 미포함\n· 급처라 네고 가능",
  },
  {
    id: "buy-5",
    mode: "purchase",
    title: "주술회전 고죠 사토루 선글라스 + 가발 세트",
    author: "주술마켓",
    createdAt: "06.15",
    viewCount: 267,
    commentCount: 2,
    priceLabel: "28,000원",
    region: "부산",
    content: "고죠 코스프레 가발 + 선글라스 세트.\n\n· 28,000원\n· 가발 품질 좋음",
  },
  {
    id: "buy-6",
    mode: "purchase",
    title: "스파이 패밀리 아냐 의상 (키즈 사이즈)",
    author: "아냐맘",
    createdAt: "06.14",
    viewCount: 178,
    commentCount: 1,
    priceLabel: "35,000원",
    region: "인천",
    content: "아냐 코스프레 의상 키즈 사이즈.\n\n· 35,000원\n· 1회 착용",
  },
  {
    id: "buy-7",
    mode: "purchase",
    title: "페어리 테일 루시 의상 + 지팡이 소품",
    author: "루시코스",
    createdAt: "06.13",
    viewCount: 312,
    commentCount: 4,
    priceLabel: "48,000원",
    region: "광주",
    content: "루시 풀셋 + 지팡이 소품.\n\n· 48,000원\n· 소품 포함 가격",
  },
  {
    id: "buy-8",
    mode: "purchase",
    title: "원피스 상디 수트 버전 (L사이즈)",
    author: "블루코스",
    createdAt: "06.12",
    viewCount: 205,
    commentCount: 2,
    priceLabel: "38,000원",
    region: "대전",
    content: "상디 수트 버전 L사이즈.\n\n· 38,000원\n· 가발 미포함",
  },
];

export const COSPLAY_BOARD_POSTS: CosplayBoardPost[] = [...rentalPosts, ...purchasePosts];

export function getCosplayBoardPosts(mode: CosplayBoardMode): CosplayBoardPost[] {
  return COSPLAY_BOARD_POSTS.filter((p) => p.mode === mode).sort((a, b) => {
    if (a.isNotice && !b.isNotice) return -1;
    if (!a.isNotice && b.isNotice) return 1;
    return 0;
  });
}

export function getCosplayBoardPost(id: string): CosplayBoardPost | undefined {
  return COSPLAY_BOARD_POSTS.find((p) => p.id === id);
}

export function parseCosplayBoardMode(value: string | undefined): CosplayBoardMode {
  return value === "purchase" ? "purchase" : "rental";
}
