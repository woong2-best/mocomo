import type { PrismaClient } from "@prisma/client";

/** 사이트 운영자 계정 — 이 username 만 ADMIN */
export const OPERATOR_USERNAME = "mocomocompany";

export async function ensureOperatorRole(prisma: PrismaClient) {
  await prisma.user.updateMany({
    where: {
      username: { not: OPERATOR_USERNAME },
      role: { in: ["ADMIN", "MODERATOR"] },
    },
    data: { role: "USER" },
  });

  const operator = await prisma.user.findUnique({
    where: { username: OPERATOR_USERNAME },
    select: { id: true, role: true },
  });

  if (operator && operator.role !== "ADMIN") {
    await prisma.user.update({
      where: { id: operator.id },
      data: { role: "ADMIN" },
    });
  }
}
