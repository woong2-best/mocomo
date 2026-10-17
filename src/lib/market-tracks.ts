import type { Prisma } from "@prisma/client";

/** Digital Studio product types. Physical browse never includes these. */
export const DIGITAL_PRODUCT_TYPES = [
  "VTUBER_3D",
  "STREAMER_ASSET",
  "EMOTES_BADGES",
  "ILLUSTRATION",
  "AUDIO_MUSIC",
  "CREATOR_RESOURCES",
] as const;

export type DigitalProductType = (typeof DIGITAL_PRODUCT_TYPES)[number];
export type MarketTrack = "physical" | "digital";
export type DigitalFulfillmentKind = "ready" | "commission";
export type DigitalDeliveryStatus = "held" | "progress" | "uploaded" | "completed";

export type DigitalDeliveryState = {
  kind: DigitalFulfillmentKind;
  status: DigitalDeliveryStatus;
  fileUrl?: string;
  fileName?: string;
  previewUrl?: string;
  approvedAt?: string;
  uploadedAt?: string;
  disputed?: boolean;
};

export const DIGITAL_AUTO_APPROVE_MS = 7 * 24 * 60 * 60 * 1000;

const DIGITAL_SET = new Set<string>(DIGITAL_PRODUCT_TYPES);

export function isDigitalProductType(id: string | null | undefined): boolean {
  return !!id && DIGITAL_SET.has(id);
}

export function isDigitalListing(input: {
  category?: string | null;
  productType?: string | null;
}): boolean {
  return input.category === "DIGITAL" || isDigitalProductType(input.productType);
}

export function marketTrackWhere(track: MarketTrack): Prisma.UsedListingWhereInput {
  const digital: Prisma.UsedListingWhereInput = {
    OR: [{ category: "DIGITAL" }, { productType: { in: [...DIGITAL_PRODUCT_TYPES] } }],
  };
  if (track === "digital") return digital;
  return { NOT: digital };
}

export function readDigitalDelivery(meta: unknown): DigitalDeliveryState | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const raw = (meta as { digitalDelivery?: unknown }).digitalDelivery;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const status = row.status;
  if (status !== "held" && status !== "progress" && status !== "uploaded" && status !== "completed") {
    return null;
  }
  return {
    kind: row.kind === "commission" ? "commission" : "ready",
    status,
    fileUrl: typeof row.fileUrl === "string" ? row.fileUrl : undefined,
    fileName: typeof row.fileName === "string" ? row.fileName : undefined,
    previewUrl: typeof row.previewUrl === "string" ? row.previewUrl : undefined,
    approvedAt: typeof row.approvedAt === "string" ? row.approvedAt : undefined,
    uploadedAt: typeof row.uploadedAt === "string" ? row.uploadedAt : undefined,
    disputed: row.disputed === true,
  };
}

export function digitalDeliveryCompleted(meta: unknown): boolean {
  return readDigitalDelivery(meta)?.status === "completed";
}

/** Buyer-facing copy of a delivery. Original file stays hidden until approval. */
export function publicDigitalDelivery(
  state: DigitalDeliveryState | null,
  role: "buyer" | "seller" | "other"
): DigitalDeliveryState | null {
  if (!state) return null;
  if (role === "seller" || state.status === "completed") return state;
  return {
    ...state,
    fileUrl: undefined,
  };
}
