/** 메모리 카드(그림 맞추기) 공유 타입·덱 생성 */

export type MemoryCard = {
  id: string;
  pairId: number;
  imageUrl: string;
  isFlipped: boolean;
  isMatched: boolean;
};

export type MemoryGamePublic = {
  cards: MemoryCard[];
  currentPlayer: string;
  firstSelectedCard: string | null;
  secondSelectedCard: string | null;
  scores: Record<string, number>;
  remainingPairs: number;
  resolving: boolean;
  pairs: number;
};

/** Fisher–Yates in-place shuffle */
export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export const MEMORY_CARD_IMAGE_POOL = [
  "/diorama/stickers/living/plant.webp",
  "/diorama/stickers/living/mug.webp",
  "/diorama/stickers/living/gamepad.webp",
  "/diorama/stickers/living/cushion.webp",
  "/diorama/stickers/living/vase.webp",
  "/diorama/stickers/living/lamp.webp",
  "/diorama/stickers/living/telephone.webp",
  "/diorama/stickers/living/candle.webp",
  "/diorama/stickers/living/tv.webp",
  "/diorama/stickers/living/sofa.webp",
  "/diorama/stickers/living/books.webp",
  "/diorama/stickers/living/magazine.webp",
] as const;

export type MemoryCardInternal = {
  id: string;
  pairId: number;
  imageUrl: string;
};

export function createMemoryCardDeck(pairs: number): MemoryCardInternal[] {
  const pool = shuffleInPlace([...MEMORY_CARD_IMAGE_POOL]);
  const images = pool.slice(0, pairs);
  const cards: MemoryCardInternal[] = [];
  for (let pairId = 0; pairId < pairs; pairId++) {
    const imageUrl = images[pairId]!;
    cards.push({ id: `card-${pairId}-a`, pairId, imageUrl });
    cards.push({ id: `card-${pairId}-b`, pairId, imageUrl });
  }
  shuffleInPlace(cards);
  return cards.map((c, i) => ({ ...c, id: `card-${i}` }));
}

export function memoryGridCols(count: number): number {
  if (count <= 8) return 4;
  if (count <= 12) return 4;
  if (count <= 16) return 4;
  return 6;
}

export const MEMORY_FLIP_BACK_MS = 1000;
