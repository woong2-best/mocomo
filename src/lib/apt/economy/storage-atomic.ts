import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export async function atomicConsumeStorageInTx(
  tx: TxClient,
  ownerId: string,
  itemId: string,
  amount: number
): Promise<boolean> {
  const result = await tx.aptStorageItem.updateMany({
    where: {
      userId: ownerId,
      itemId,
      quantity: { gte: amount },
    },
    data: { quantity: { decrement: amount } },
  });
  return result.count === 1;
}

/** 창고 반환 — 인벤토리 수량을 초과할 수 없음 (이중 반환 방지) */
export async function atomicReturnStorageInTx(
  tx: TxClient,
  ownerId: string,
  itemId: string,
  amount: number
): Promise<boolean> {
  const [inv, storage] = await Promise.all([
    tx.aptInventoryItem.findUnique({
      where: { userId_itemId: { userId: ownerId, itemId } },
      select: { quantity: true },
    }),
    tx.aptStorageItem.findUnique({
      where: { userId_itemId: { userId: ownerId, itemId } },
      select: { quantity: true },
    }),
  ]);

  const owned = inv?.quantity ?? 0;
  const current = storage?.quantity ?? 0;
  if (current + amount > owned) {
    return false;
  }

  await tx.aptStorageItem.upsert({
    where: { userId_itemId: { userId: ownerId, itemId } },
    create: { userId: ownerId, itemId, quantity: amount },
    update: { quantity: { increment: amount } },
  });
  return true;
}
