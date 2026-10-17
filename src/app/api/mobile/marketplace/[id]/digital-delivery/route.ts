import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { mutateDigitalDelivery } from "@/lib/digital-delivery";
import { isDigitalListing, publicDigitalDelivery, readDigitalDelivery } from "@/lib/market-tracks";
import { db } from "@/lib/db";

const bodySchema = z.object({
  action: z.enum(["start", "upload", "approve"]),
  fileUrl: z.string().max(2000).optional(),
  fileName: z.string().max(180).optional(),
  previewUrl: z.string().max(2000).optional(),
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
  const state =
    readDigitalDelivery(listing.subcultureMeta) ??
    ({ kind: "commission" as const, status: "held" as const });
  const view = publicDigitalDelivery(state, role === "seller" ? "seller" : "buyer");
  return NextResponse.json({
    digital: true,
    role,
    delivery: role === "other" && view ? { ...view, fileUrl: undefined, previewUrl: undefined } : view,
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
  const role = parsed.data.action === "approve" ? "buyer" : "seller";
  return NextResponse.json({
    delivery: publicDigitalDelivery(result.delivery, role),
  });
}
