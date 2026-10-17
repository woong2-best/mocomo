import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getMyCreatorStudio, saveCreatorStudio, type StudioInput } from "@/lib/creator-studio";

const media = z.object({
  url: z.string().max(2000),
  kind: z.enum(["image", "gif", "video"]),
});
const tier = z.object({
  id: z.string().max(40),
  name: z.string().max(40),
  price: z.number().int().positive(),
});
const addon = z.object({
  id: z.string().max(40),
  name: z.string().max(40),
  mode: z.enum(["fixed", "percent"]),
  amount: z.number().int().positive(),
});
const field = z.object({
  id: z.string().max(40),
  label: z.string().max(80),
  kind: z.enum(["text", "image"]),
  required: z.boolean(),
});
const bodySchema = z.object({
  title: z.string().max(80),
  about: z.string().max(2000),
  open: z.boolean(),
  slotCap: z.number().int(),
  deliveryDays: z.number().int(),
  revisionNote: z.string().max(1000),
  currency: z.string().max(8),
  portfolio: z.array(media).max(8),
  tiers: z.array(tier).max(8),
  addons: z.array(addon).max(12),
  formFields: z.array(field).max(8),
});

export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;
  const studio = await getMyCreatorStudio(auth.user.id);
  return NextResponse.json({ studio });
}

export async function PUT(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-studio-save", 20);
  if (limited) return limited;
  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid studio." }, { status: 400 });
  const result = await saveCreatorStudio(auth.user.id, auth.user.username, parsed.data as StudioInput);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
