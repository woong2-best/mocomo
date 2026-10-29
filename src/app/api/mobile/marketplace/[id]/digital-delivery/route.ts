import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { attachCloudShareSecret, maybeAutoApproveDigitalDelivery, mutateDigitalDelivery } from "@/lib/digital-delivery";
import { isDigitalListing, publicDigitalDelivery, readDigitalDelivery } from "@/lib/market-tracks";
import { db } from "@/lib/db";

const bodySchema = z.object({
  action: z.enum(["start", "upload", "approve", "dispute"]),
  fileUrl: z.string().max(2000).optional(),
  fileName: z.string().max(180).optional(),
  previewUrl: z.string().max(2000).optional(),
  disputeReason: z.string().max(500).optional(),
  cloudShareUrl: z.string().max(2000).optional(),
  sharePassword: z.string().max(128).optional(),
  fileSha256: z.string().max(64).optional(),
  fileMimeType: z.string().max(120).optional(),
  fileSizeBytes: z.number().int().positive().max(2_000_000_000).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const listing = await db.usedListing.findUnique({
    where: { id },
    select: { sellerId: true, subcultureMeta: true, category: true, productType: true },
  });
  if (!listing || !isDigitalListing(listing)) {
    return NextResponse.json({ delivery: null, digital: false });
  }
  const buyerChat = await db.usedListingChat.findFirst({
    where: { listingId: id, buyerId: auth.user.id },
    select: { id: true },
  });
  const orderItem = await db.marketplaceOrderItem.findFirst({
    where: { usedListingId: id, order: { buyerId: auth.user.id } },
    select: { id: true },
  });
  const role = listing.sellerId === auth.user.id ? "seller" : buyerChat || orderItem ? "buyer" : "other";
  const refreshed = await maybeAutoApproveDigitalDelivery(id, auth.user.id);
  const state =
    refreshed ??
    readDigitalDelivery(listing.subcultureMeta) ??
    ({ kind: "commission" as const, status: "held" as const });
  const view = publicDigitalDelivery(state, role === "seller" ? "seller" : role === "buyer" ? "buyer" : "other");
  const delivery = await attachCloudShareSecret(id, role === "seller" || role === "buyer" ? role : "other", view);
  return NextResponse.json({
    digital: true,
    role,
    delivery,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-digital-delivery", 20);
  if (limited) return limited;
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const result = await mutateDigitalDelivery(auth.user.id, id, parsed.data.action, parsed.data);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  const role = parsed.data.action === "approve" || parsed.data.action === "dispute" ? "buyer" : "seller";
  const view = publicDigitalDelivery(result.delivery, role);
  const delivery = await attachCloudShareSecret(id, role, view);
  return NextResponse.json({ delivery });
}
