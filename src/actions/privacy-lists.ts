"use server";

import { requireAuthMinimal } from "@/lib/auth";
import { db } from "@/lib/db";

export type PrivacyListUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

const userSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} as const;

export async function listBlockedUsers(): Promise<PrivacyListUser[]> {
  const user = await requireAuthMinimal();
  const rows = await db.userBlock.findMany({
    where: { blockerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { blocked: { select: userSelect } },
  });
  return rows.map((row) => row.blocked);
}

export async function listMutedUsers(): Promise<PrivacyListUser[]> {
  const user = await requireAuthMinimal();
  const rows = await db.userMute.findMany({
    where: { muterId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { muted: { select: userSelect } },
  });
  return rows.map((row) => row.muted);
}
