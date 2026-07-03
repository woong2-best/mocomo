import type { PrismaClient } from "@prisma/client";

/** 시드·폴백·데모용 AdSlot 비활성화 (실제 광고는 관리자가 새로 등록) */
export async function deactivateDemoAdSlots(prisma: PrismaClient) {
  await prisma.adSlot.updateMany({
    where: {
      active: true,
      OR: [
        { imageUrl: { startsWith: "/ads/" } },
        { sponsorName: { in: ["MoCoMo", "MoCoMo Live", "MoCoMo Events"] } },
        { title: { contains: "AGF", mode: "insensitive" } },
        {
          title: {
            in: [
              "진행 중인 이벤트",
              "MoCoMo Premium — 광고 없이 애니덕질",
              "MoCoMo Premium — 광고 없이",
              "MoCoMo Premium",
              "라이브 방송 시작하기",
              "후원 이모티콘",
              "라이브 방송",
            ],
          },
        },
      ],
    },
    data: { active: false },
  });
}
