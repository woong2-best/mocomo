import { db } from "@/lib/db";
import { normalizeChatAttachmentUrl } from "@/lib/chat-attachments";
import {
  isUsedListingAttachment,
  parseChatUsedListing,
  usedListingAttachmentName,
} from "@/lib/chat-used-listing-share";
import { formatUsedPrice, listingImages } from "@/lib/used-market";

export type UsedListingShareCard = {
  id: string;
  title: string;
  imageUrl: string | null;
  priceLabel: string;
  saleType: string;
  href: string;
};

export function listingShareImageUrl(images: unknown): string | null {
  const raw = listingImages(images)[0];
  if (!raw) return null;
  return normalizeChatAttachmentUrl(raw);
}

export async function loadUsedListingShareCard(
  listingId: string
): Promise<UsedListingShareCard | null> {
  const map = await loadUsedListingShareCards([listingId]);
  return map.get(listingId) ?? null;
}

export async function loadUsedListingShareCards(
  ids: string[]
): Promise<Map<string, UsedListingShareCard>> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 40);
  const out = new Map<string, UsedListingShareCard>();
  if (unique.length === 0) return out;

  const rows = await db.usedListing.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      title: true,
      images: true,
      price: true,
      currency: true,
      currentBidAmount: true,
      saleType: true,
    },
  });

  for (const row of rows) {
    const amount = row.currentBidAmount ?? row.price;
    out.set(row.id, {
      id: row.id,
      title: row.title,
      imageUrl: listingShareImageUrl(row.images),
      priceLabel: formatUsedPrice(amount, row.currency),
      saleType: row.saleType,
      href: `/market/${row.id}`,
    });
  }
  return out;
}

type PresentableAttachment = {
  id: string;
  url: string;
  type: string;
  name?: string | null;
  priceKrw?: number;
  locked?: boolean;
};

type PresentableMessage = {
  id: string;
  content: string | null;
  attachments?: PresentableAttachment[];
};

/**
 * Phone builds that do not know the card marker still render attachments + text.
 * Rewrite the inquiry template into the product photo and name, and attach a
 * snapshot the newer app uses as a tappable card.
 */
export async function presentMobileUsedListingMessages<T extends PresentableMessage>(
  messages: T[]
): Promise<(T & { usedListing?: UsedListingShareCard | null })[]> {
  const ids: string[] = [];
  for (const message of messages) {
    const parsed = parseChatUsedListing(message.content);
    if (parsed) ids.push(parsed.listingId);
    for (const attachment of message.attachments ?? []) {
      if (!isUsedListingAttachment(attachment)) continue;
      const fromName = attachment.name?.replace(/^used-listing:/i, "");
      if (fromName) ids.push(fromName);
    }
  }
  const cards = await loadUsedListingShareCards(ids);

  return messages.map((message) => {
    const parsed = parseChatUsedListing(message.content);
    const named = (message.attachments ?? [])
      .map((attachment) => attachment.name?.match(/^used-listing:([a-z0-9]+)$/i)?.[1])
      .find((id): id is string => !!id);
    const listingId = parsed?.listingId ?? named;
    const card = listingId ? cards.get(listingId) : undefined;
    if (!card) return message;

    const attachments: PresentableAttachment[] = [...(message.attachments ?? [])];
    const hasPhoto = attachments.some(
      (attachment) => isUsedListingAttachment(attachment) || attachment.url === card.imageUrl
    );
    if (!hasPhoto && card.imageUrl) {
      attachments.push({
        id: `used-card-${message.id}`,
        url: card.imageUrl,
        type: "IMAGE",
        name: usedListingAttachmentName(card.id),
      });
    }

    return {
      ...message,
      content: parsed?.note ?? card.title,
      attachments: attachments as T["attachments"],
      usedListing: card,
    };
  });
}
