import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  createDigitalCommission,
  listDigitalCommissions,
  respondDigitalCommission,
} from "@/lib/digital-commission";

const createSchema = z.object({
  sellerId: z.string().min(1),
  brief: z.string().min(8).max(4000),
  purpose: z.enum(["broadcast", "personal"]),
  referenceUrls: z.array(z.string().max(2000)).max(6).optional(),
});

const answerSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["accept", "decline"]),
  price: z.number().int().positive().optional(),
  estimatedDays: z.number().int().positive().max(90).optional(),
  currency: z.string().max(8).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;
  const items = await listDigitalCommissions(auth.user.id);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-commission", 20);
  if (limited) return limited;
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;
  const json = await req.json().catch(() => null);
  const created = createSchema.safeParse(json);
  if (created.success) {
    const result = await createDigitalCommission({
      buyerId: auth.user.id,
      sellerId: created.data.sellerId,
      brief: created.data.brief,
      purpose: created.data.purpose,
      referenceUrls: created.data.referenceUrls ?? [],
    });
    if ("error" in result) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  }
  const answer = answerSchema.safeParse(json);
  if (!answer.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const result = await respondDigitalCommission(auth.user.id, answer.data.id, answer.data.action, {
    price: answer.data.price ?? 0,
    estimatedDays: answer.data.estimatedDays ?? 0,
    currency: answer.data.currency,
  });
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
