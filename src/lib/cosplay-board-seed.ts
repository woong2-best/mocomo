import type { PrismaClient } from "@prisma/client";

const PLATFORM_EMAIL = "platform@mocomo.app";

type SeedPost = {
  mode: "RENTAL" | "PURCHASE";
  title: string;
  content: string;
  priceLabel: string;
  price?: number;
  region?: string;
  workTitle?: string;
  character?: string;
  sizeLabel?: string;
  isNotice?: boolean;
};

const SEED_POSTS: SeedPost[] = [
  {
    mode: "RENTAL",
    title: "[대여] 블루 아카이브 아리사 풀셋 (가발·총·신발 포함)",
    content:
      "사이즈 M 기준, 가발·총·신발·장갑 풀셋 대여합니다.\n\n· 1일 25,000원 / 3일 60,000원\n· 보증금 50,000원 (반납 확인 후 환불)\n· 직거래: 강남역 2번 출구\n· 세탁·수선 완료 상태",
    price: 25000,
    priceLabel: "1일 25,000원",
    region: "서울 강남",
    workTitle: "블루 아카이브",
    character: "아리사",
    sizeLabel: "M",
    isNotice: true,
  },
  {
    mode: "RENTAL",
    title: "원신 나히다 풀셋 대여 (가발 O)",
    content:
      "나히다 풀셋 대여합니다. 가발 포함, 사이즈 S~M.\n\n· 1일 30,000원\n· 택배 가능 (왕복 택배비 별도)\n· 착용 전후 사진 필수",
    price: 30000,
    priceLabel: "1일 30,000원",
    region: "경기 수원",
    workTitle: "원신",
    character: "나히다",
    sizeLabel: "S~M",
  },
  {
    mode: "RENTAL",
    title: "체인소맨 레제 의상 + 가발 대여",
    content: "레제 코스프레 의상 + 가발 대여. 사이즈 Free.\n\n· 1일 18,000원\n· 부산 서면 직거래",
    price: 18000,
    priceLabel: "1일 18,000원",
    region: "부산 서면",
    workTitle: "체인소맨",
    character: "레제",
    sizeLabel: "Free",
  },
  {
    mode: "PURCHASE",
    title: "[판매] 원신 라이덴 쇼군 의상 M사이즈 (1회 착용)",
    content:
      "라이덴 쇼군 의상 M사이즈 판매합니다.\n\n· 1회 착용, 세탁 완료\n· 가발 미포함\n· 85,000원 (네고 가능)",
    price: 85000,
    priceLabel: "85,000원",
    region: "서울",
    workTitle: "원신",
    character: "라이덴 쇼군",
    sizeLabel: "M",
    isNotice: true,
  },
  {
    mode: "PURCHASE",
    title: "체인소맨 파워 가발 + 의상 세트 판매",
    content: "파워 풀셋 (의상 + 가발) 판매.\n\n· 55,000원\n· 사이즈 Free\n· 상태 A급",
    price: 55000,
    priceLabel: "55,000원",
    region: "경기",
    workTitle: "체인소맨",
    character: "파워",
    sizeLabel: "Free",
  },
  {
    mode: "PURCHASE",
    title: "[급처] 마법소녀 코스프레 의상 일괄 (3벌)",
    content:
      "마법소녀 계열 의상 3벌 일괄 판매.\n\n· 120,000원 (개별 판매 불가)\n· 사이즈 S~M\n· 가발 미포함",
    price: 120000,
    priceLabel: "120,000원",
    region: "서울",
    sizeLabel: "S~M",
  },
];

export async function ensureCosplayBoardSeed(prisma: PrismaClient) {
  try {
    const count = await prisma.cosplayBoardPost.count();
    if (count > 0) return;

    const platform = await prisma.user.findUnique({
      where: { email: PLATFORM_EMAIL },
      select: { id: true },
    });
    if (!platform) return;

    await prisma.cosplayBoardPost.createMany({
      data: SEED_POSTS.map((p) => ({
        authorId: platform.id,
        mode: p.mode,
        title: p.title,
        content: p.content,
        price: p.price ?? null,
        priceLabel: p.priceLabel,
        region: p.region ?? null,
        workTitle: p.workTitle ?? null,
        character: p.character ?? null,
        sizeLabel: p.sizeLabel ?? null,
        isNotice: p.isNotice ?? false,
        images: [],
      })),
    });
  } catch {
    // table may not exist yet on first deploy
  }
}
